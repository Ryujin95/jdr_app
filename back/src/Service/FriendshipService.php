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

        if ((int)$count <= 0) {
            throw new AccessDeniedHttpException("Tu peux ajouter en ami seulement quelqu'un qui est dans au moins un même JDR.");
        }
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
                'username' => method_exists($other, 'getUsername') ? $other->getUsername() : (string)$other->getUserIdentifier(),
                'acceptedAt' => $f->getAcceptedAt()?->format(\DateTimeInterface::ATOM),
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
                'username' => method_exists($other, 'getUsername') ? $other->getUsername() : (string)$other->getUserIdentifier(),
                'createdAt' => $f->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        };

        return [
            'incoming' => array_map($mapOne, $incoming),
            'outgoing' => array_map($mapOne, $outgoing),
        ];
    }
}
