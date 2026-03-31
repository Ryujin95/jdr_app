<?php

namespace App\Service;

use App\Entity\Friendship;
use App\Entity\User;
use App\Repository\FriendshipRepository;
use App\Repository\UserRepository;
use App\Repository\Campaign\CampaignMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class FriendshipService
{
    public function __construct(
        private EntityManagerInterface $em,
        private FriendshipRepository $friendRepo,
        private UserRepository $userRepo,
        private CampaignMemberRepository $campaignMemberRepo,
    ) {}

    private function purgeExpiredPending(): void
    {
        $cutoff = (new \DateTimeImmutable())->modify('-7 days');
        $this->friendRepo->deleteExpiredPending($cutoff);
    }

    private function assertShareCampaign(User $a, User $b): void
    {
        $count = $this->campaignMemberRepo->createQueryBuilder('m1')
            ->select('COUNT(m1.id)')
            ->innerJoin('App\Entity\CampaignMember', 'm2', 'WITH', 'm1.campaign = m2.campaign')
            ->andWhere('m1.user = :a')
            ->andWhere('m2.user = :b')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->getQuery()
            ->getSingleScalarResult();

        if ((int) $count <= 0) {
            throw new AccessDeniedHttpException("Tu peux ajouter en ami seulement quelqu'un qui est dans au moins un même JDR.");
        }
    }

    private function isUserOnline(User $user): bool
    {
        if (!method_exists($user, 'getLastSeen')) {
            return false;
        }

        $lastSeen = $user->getLastSeen();
        if (!$lastSeen instanceof \DateTimeImmutable) {
            return false;
        }

        $threshold = (new \DateTimeImmutable())->modify('-2 minutes');
        return $lastSeen >= $threshold;
    }

    public function request(User $me, int $otherUserId): Friendship
    {
        $this->purgeExpiredPending();

        $other = $this->userRepo->find($otherUserId);
        if (!$other) {
            throw new NotFoundHttpException("Utilisateur introuvable.");
        }

        if ($other->getId() === $me->getId()) {
            throw new AccessDeniedHttpException("Tu ne peux pas t'ajouter toi-même.");
        }

        $this->assertShareCampaign($me, $other);

        $existing = $this->friendRepo->findBetweenUsers($me, $other);
        if ($existing) {
            if ($existing->getStatus() === Friendship::STATUS_ACCEPTED) {
                return $existing;
            }
            if ($existing->getStatus() === Friendship::STATUS_PENDING) {
                return $existing;
            }
            throw new AccessDeniedHttpException("Action impossible (relation bloquée).");
        }

        [$low, $high] = Friendship::orderPair($me, $other);

        $f = new Friendship();
        $f->setUserLow($low);
        $f->setUserHigh($high);
        $f->setRequestedBy($me);
        $f->setStatus(Friendship::STATUS_PENDING);

        $this->em->persist($f);
        $this->em->flush();

        return $f;
    }

    public function accept(User $me, int $friendshipId): Friendship
    {
        $this->purgeExpiredPending();

        $f = $this->friendRepo->find($friendshipId);
        if (!$f) {
            throw new NotFoundHttpException("Demande introuvable.");
        }

        $meId = $me->getId();
        $isMember = ($f->getUserLow()?->getId() === $meId) || ($f->getUserHigh()?->getId() === $meId);
        if (!$isMember) {
            throw new AccessDeniedHttpException("Accès interdit.");
        }

        if ($f->getStatus() !== Friendship::STATUS_PENDING) {
            return $f;
        }

        if ($f->getRequestedBy()?->getId() === $meId) {
            throw new AccessDeniedHttpException("Tu ne peux pas accepter ta propre demande.");
        }

        $f->setStatus(Friendship::STATUS_ACCEPTED);
        $f->setAcceptedAt(new \DateTimeImmutable());

        $this->em->flush();

        return $f;
    }

    public function decline(User $me, int $friendshipId): void
    {
        $this->purgeExpiredPending();

        $f = $this->friendRepo->find($friendshipId);
        if (!$f) {
            throw new NotFoundHttpException("Demande introuvable.");
        }

        $meId = $me->getId();
        $isMember = ($f->getUserLow()?->getId() === $meId) || ($f->getUserHigh()?->getId() === $meId);
        if (!$isMember) {
            throw new AccessDeniedHttpException("Accès interdit.");
        }

        if ($f->getStatus() === Friendship::STATUS_ACCEPTED) {
            throw new AccessDeniedHttpException("Utilise la suppression d'ami pour retirer un ami.");
        }

        $this->em->remove($f);
        $this->em->flush();
    }

    public function remove(User $me, int $otherUserId): void
    {
        $this->purgeExpiredPending();

        $other = $this->userRepo->find($otherUserId);
        if (!$other) {
            throw new NotFoundHttpException("Utilisateur introuvable.");
        }

        $f = $this->friendRepo->findBetweenUsers($me, $other);
        if (!$f) {
            return;
        }

        $meId = $me->getId();
        $isMember = ($f->getUserLow()?->getId() === $meId) || ($f->getUserHigh()?->getId() === $meId);
        if (!$isMember) {
            throw new AccessDeniedHttpException("Accès interdit.");
        }

        $this->em->remove($f);
        $this->em->flush();
    }

    /** @return array<int, array<string,mixed>> */
    public function listFriends(User $me): array
    {
        $this->purgeExpiredPending();

        $list = $this->friendRepo->listForUser($me, Friendship::STATUS_ACCEPTED);

        $out = [];
        foreach ($list as $f) {
            $other = $f->getOther($me);

            $out[] = [
                'friendshipId' => $f->getId(),
                'userId' => $other->getId(),
                'username' => method_exists($other, 'getUsername') ? $other->getUsername() : (string) $other->getUserIdentifier(),
                'avatarUrl' => method_exists($other, 'getAvatarUrl') ? $other->getAvatarUrl() : null,
                'acceptedAt' => $f->getAcceptedAt()?->format(\DateTimeInterface::ATOM),
                'isOnline' => $this->isUserOnline($other),
                'lastSeen' => method_exists($other, 'getLastSeen') && $other->getLastSeen()
                    ? $other->getLastSeen()->format(\DateTimeInterface::ATOM)
                    : null,
            ];
        }

        return $out;
    }

    /** @return array<string, array<int, array<string,mixed>>> */
    public function listRequests(User $me): array
    {
        $this->purgeExpiredPending();

        $incoming = $this->friendRepo->findIncomingPending($me);
        $outgoing = $this->friendRepo->findOutgoingPending($me);

        $mapOne = function (Friendship $f) use ($me): array {
            $other = $f->getOther($me);
            return [
                'friendshipId' => $f->getId(),
                'userId' => $other->getId(),
                'username' => method_exists($other, 'getUsername') ? $other->getUsername() : (string) $other->getUserIdentifier(),
                'avatarUrl' => method_exists($other, 'getAvatarUrl') ? $other->getAvatarUrl() : null,
                'createdAt' => $f->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        };

        return [
            'incoming' => array_map($mapOne, $incoming),
            'outgoing' => array_map($mapOne, $outgoing),
        ];
    }

    private function assertFriends(User $me, User $other): Friendship
    {
        $f = $this->friendRepo->findBetweenUsers($me, $other);
        if (!$f || $f->getStatus() !== Friendship::STATUS_ACCEPTED) {
            throw new AccessDeniedHttpException("Accès interdit.");
        }
        return $f;
    }

    /** @return array<string,mixed> */
    public function getFriendProfile(User $me, int $otherUserId): array
    {
        $this->purgeExpiredPending();

        $other = $this->userRepo->find($otherUserId);
        if (!$other) {
            throw new NotFoundHttpException("Utilisateur introuvable.");
        }

        if ($other->getId() === $me->getId()) {
            throw new AccessDeniedHttpException("Action impossible.");
        }

        $this->assertFriends($me, $other);

        return [
            'userId' => $other->getId(),
            'username' => method_exists($other, 'getUsername') ? $other->getUsername() : (string) $other->getUserIdentifier(),
            'avatarUrl' => method_exists($other, 'getAvatarUrl') ? $other->getAvatarUrl() : null,
            'campaignVisibility' => method_exists($other, 'getProfileCampaignVisibility') ? $other->getProfileCampaignVisibility() : 'COMMON_ONLY',
            'campaigns' => $this->getVisibleCampaignsForViewer($other, $me),
        ];
    }

    /** @return array<int, array<string,mixed>> */
    private function getVisibleCampaignsForViewer(User $friend, User $viewer): array
    {
        $visibility = method_exists($friend, 'getProfileCampaignVisibility')
            ? (string) $friend->getProfileCampaignVisibility()
            : 'COMMON_ONLY';

        $qb = $this->campaignMemberRepo->createQueryBuilder('mF')
            ->select('c.id AS id')
            ->addSelect('c.title AS name')
            ->addSelect('c.theme AS theme')
            ->addSelect('mF.role AS friendRole')
            ->addSelect('COUNT(DISTINCT mAll.id) AS membersCount')
            ->addSelect('COUNT(DISTINCT ch.id) AS charactersCount')
            ->addSelect('COUNT(DISTINCT loc.id) AS locationsCount')
            ->innerJoin('mF.campaign', 'c')
            ->leftJoin('App\Entity\CampaignMember', 'mAll', 'WITH', 'mAll.campaign = c')
            ->leftJoin('App\Entity\Character', 'ch', 'WITH', 'ch.campaign = c')
            ->leftJoin('App\Entity\Location', 'loc', 'WITH', 'loc.campaign = c')
            ->andWhere('mF.user = :friend')
            ->setParameter('friend', $friend)
            ->groupBy('c.id, c.title, c.theme, mF.role');

        if ($visibility !== 'ALL_FRIENDS') {
            $qb->innerJoin(
                'App\Entity\CampaignMember',
                'mV',
                'WITH',
                'mV.campaign = c AND mV.user = :viewer'
            )->setParameter('viewer', $viewer);
        }

        $rows = $qb->getQuery()->getArrayResult();

        return array_map(static fn($r) => [
            'id' => (int) $r['id'],
            'name' => (string) $r['name'],
            'theme' => $r['theme'] !== null ? (string) $r['theme'] : null,
            'friendRole' => $r['friendRole'] ?? null,
            'membersCount' => (int) $r['membersCount'],
            'charactersCount' => (int) $r['charactersCount'],
            'locationsCount' => (int) $r['locationsCount'],
        ], $rows);
    }
}
