<?php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\Map\Map;
use App\Entity\User;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

class CampaignService
{
   public function __construct(
        private EntityManagerInterface $em,
        private CampaignRepository $campaignRepo,
        private CampaignMemberRepository $campaignMemberRepo,
        private MapRepository $mapRepo,
        private ZoneRepository $zoneRepo,
        private string $projectDir,
        private CampaignAuthorization $campaignAuthorization,
        private CampaignRolePolicy $campaignRolePolicy,
        private ManagedMediaCleanupService $mediaCleanup,
    ) {}

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user): array
    {
        $rows = $this->campaignRepo->findForUser($user);

        return array_map(static function (array $r): array {
    return [
        'id' => (int) $r['id'],
        'title' => (string) $r['title'],
        'theme' => $r['theme'] !== null ? (string) $r['theme'] : null,
        'role' => (string) $r['role'],
        'updatedAt' => $r['updatedAt'] instanceof \DateTimeInterface
            ? $r['updatedAt']->format(\DateTimeInterface::ATOM)
            : null,
        'joinCode' => array_key_exists('joinCode', $r) ? $r['joinCode'] : null,
        'mapId' => $r['mapId'] ?? null,
    ];
}, $rows);

    }

    public function deleteCampaign(User $user, int $campaignId): void
    {
        $campaign = $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
        $maps = $this->mapRepo->findBy(['campaign' => $campaign]);
        $imagePaths = array_map(static fn(Map $map): string => $map->getImagePath(), $maps);

        try {
            $this->em->wrapInTransaction(function (EntityManagerInterface $em) use ($campaign, $maps): void {
                foreach ($maps as $map) {
                    // Remove zone positions and zones explicitly so behavior does not
                    // depend on whether the deployed schema has the expected FK cascades.
                    foreach ($this->zoneRepo->findBy(['map' => $map]) as $zone) {
                        if (
                            $zone->getLocation() !== null
                            && $zone->getLocation()?->getCampaign()?->getId() !== $campaign->getId()
                        ) {
                            throw new ConflictHttpException(
                                'La campagne contient une carte liée à un lieu d’une autre campagne.',
                            );
                        }

                        $em->createQuery('DELETE FROM App\\Entity\\Map\\CharacterZonePosition p WHERE p.zone = :zone')
                            ->setParameter('zone', $zone)
                            ->execute();
                        $em->remove($zone);
                    }

                    foreach ($em->getRepository(Campaign::class)->findBy(['map' => $map]) as $attachedCampaign) {
                        if ($attachedCampaign->getId() !== $campaign->getId()) {
                            throw new ConflictHttpException('Une autre campagne utilise une carte de cette campagne.');
                        }
                    }
                    if ($campaign->getMap()?->getId() === $map->getId()) {
                        $campaign->setMap(null);
                    }
                    $em->remove($map);
                }

                // Existing nullable links declare these as retained game content.
                $em->createQuery('UPDATE App\\Entity\\Character c SET c.campaign = NULL WHERE c.campaign = :campaign')
                    ->setParameter('campaign', $campaign)
                    ->execute();
                $em->createQuery('UPDATE App\\Entity\\Location l SET l.campaign = NULL WHERE l.campaign = :campaign')
                    ->setParameter('campaign', $campaign)
                    ->execute();

                $em->createQuery('DELETE FROM App\\Entity\\CampaignMember m WHERE m.campaign = :campaign')
                    ->setParameter('campaign', $campaign)
                    ->execute();
                $em->remove($campaign);
            });
        } catch (ForeignKeyConstraintViolationException $exception) {
            throw new ConflictHttpException(
                'La campagne possède encore des ressources liées qui empêchent sa suppression.',
                $exception,
            );
        }

        foreach ($imagePaths as $imagePath) {
            $this->mediaCleanup->cleanupMapImageAfterDeletion($imagePath);
        }
    }

   public function createCampaign(User $creator, string $title, ?string $theme): Campaign
{
    $campaign = new Campaign();
    $campaign->setTitle($title);
    $campaign->setTheme($theme);
    $campaign->setJoinCode($this->generateUniqueJoinCode(6));

    $member = new CampaignMember();
    $member->setUser($creator);
    $member->setRole('MJ');

    $campaign->addMember($member);

    $this->em->persist($campaign);
    $this->em->persist($member);
    $this->em->flush();

    return $campaign;
}
    public function attachMapToCampaign(User $user, int $campaignId, int $mapId): Campaign
    {
        $campaign = $this->getForUser($user, $campaignId);

        $map = $this->mapRepo->find($mapId);
        if (!$map) {
            throw new \InvalidArgumentException('Map introuvable.');
        }

        $campaign->setMap($map);
        $this->em->flush();

        return $campaign;
    }
    public function createMapAndAttachToCampaign(
        User $user,
        int $campaignId,
        ?string $mapName,
        UploadedFile $mapImage
    ): Campaign {
        $campaign = $this->getForUser($user, $campaignId);

        if (!$mapImage) {
            throw new \InvalidArgumentException('Image de map requise');
        }

        $map = new Map();
        $name = ($mapName && trim($mapName) !== '') ? trim($mapName) : $campaign->getTitle();
        $map->setName($name);

        $targetDir = $this->projectDir . '/public/uploads/maps';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $ext = $mapImage->guessExtension() ?: 'jpg';
        $filename = 'map_' . bin2hex(random_bytes(8)) . '.' . $ext;
        $mapImage->move($targetDir, $filename);

        $map->setImagePath('/uploads/maps/' . $filename);

        $this->em->persist($map);

        $campaign->setMap($map);
        $this->em->flush();

        return $campaign;
    }

    public function joinByCode(User $user, string $code): Campaign
    {
        $clean = strtoupper(trim($code));
        if ($clean === '' || strlen($clean) < 4) {
            throw new \InvalidArgumentException('Code invalide.');
        }

        $campaign = $this->campaignRepo->findOneBy(['joinCode' => $clean]);
        if (!$campaign) {
            throw new \RuntimeException('Campagne introuvable.');
        }

        if ($this->campaignMemberRepo->findOneByCampaignAndUser($campaign, $user)) {
            return $campaign;
        }

        $member = new CampaignMember();
        $member->setUser($user);
        $member->setRole('Player');

        $campaign->addMember($member);

        $this->em->persist($member);
        $this->em->flush();

        return $campaign;
    }

    public function getMemberRole(User $user, Campaign $campaign): string
    {
        $member = $this->campaignMemberRepo->findOneByCampaignAndUser($campaign, $user);
        if (!$member) {
            throw new AccessDeniedHttpException('Tu n’es pas membre de cette campagne.');
        }

        return $member->getRole();
    }

    private function generateUniqueJoinCode(int $length = 6): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $maxTries = 50;

        for ($try = 0; $try < $maxTries; $try++) {
            $code = '';
            for ($i = 0; $i < $length; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }

            $exists = $this->campaignRepo->findOneBy(['joinCode' => $code]);
            if (!$exists) {
                return $code;
            }
        }

        throw new \RuntimeException('Impossible de générer un code unique.');
    }

    public function getForUser(User $user, int $campaignId): Campaign
    {
        $campaign = $this->campaignRepo->find($campaignId);
        if (!$campaign) {
            throw new \RuntimeException('Campaign not found');
        }

        foreach ($campaign->getMembers() as $m) {
            if ($m->getUser() && $m->getUser()->getId() === $user->getId()) {
                return $campaign;
            }
        }

        throw new \InvalidArgumentException('Forbidden');
    }

public function getForUserData(User $user, int $campaignId): array
{
    $row = $this->campaignRepo->findOneForUser($user, $campaignId);
    if (!$row) {
        throw new \InvalidArgumentException('Forbidden');
    }

    return [
        'id' => (int) $row['id'],
        'title' => (string) $row['title'],
        'theme' => $row['theme'] !== null ? (string) $row['theme'] : null,
        'joinCode' => $row['joinCode'] !== null ? (string) $row['joinCode'] : null,
        'updatedAt' => $row['updatedAt'] instanceof \DateTimeInterface
            ? $row['updatedAt']->format(\DateTimeInterface::ATOM)
            : null,
        'role' => (string) $row['role'],
        'mapId' => $row['mapId'] !== null ? (int) $row['mapId'] : null,
    ];
}

public function leaveCampaign(User $user, int $campaignId): void
    {
        $campaign = $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ', 'Player']);

        $member = $this->campaignMemberRepo->findOneByCampaignAndUser($campaign, $user);

        if (!$member) {
            throw new AccessDeniedHttpException('Tu n’es pas membre de cette campagne.');
        }

        if (!$this->campaignRolePolicy->canLeaveCampaign($member->getRole())) {
            throw new AccessDeniedHttpException("Un MJ doit transférer son rôle avant de quitter la campagne.");
        }

        $this->em->remove($member);
        $this->em->flush();
    }

public function transferMj(User $currentUser, int $campaignId, int $newMjUserId): void
{
    if ($newMjUserId <= 0) {
        throw new \InvalidArgumentException('Utilisateur cible invalide.');
    }

    $campaign = $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
    $currentMember = $this->campaignMemberRepo->findOneByCampaignAndUser($campaign, $currentUser);
    if (!$currentMember) {
        throw new AccessDeniedHttpException('Seul le MJ actuel de cette campagne peut transférer ce rôle.');
    }
    if ($currentMember->getRole() !== 'MJ') {
        throw new AccessDeniedHttpException('Seul le MJ actuel de cette campagne peut transférer ce rôle.');
    }

    $targetUser = $this->em->getReference(User::class, $newMjUserId);
    $newMember = $targetUser instanceof User
        ? $this->campaignMemberRepo->findOneByCampaignAndUser($campaign, $targetUser)
        : null;
    if (!$newMember) {
        throw new AccessDeniedHttpException('La cible doit être membre de cette campagne.');
    }

    if (!$this->campaignRolePolicy->canTransferMj($currentMember->getRole(), $newMember->getRole(), true)) {
        throw new AccessDeniedHttpException('La cible doit être un joueur de cette campagne.');
    }

    $currentMember->setRole('Player');
    $newMember->setRole('MJ');

    $this->em->flush();
}

public function getMembers(User $user, int $campaignId): array
{
    $campaign = $this->getForUser($user, $campaignId);

    $result = [];

    foreach ($campaign->getMembers() as $member) {
        $u = $member->getUser();

        if (!$u) continue;

        $result[] = [
            'id' => $u->getId(),
            'username' => $u->getUsername(), // ou getEmail() si tu préfères
            'role' => $member->getRole(),
        ];
    }

    return $result;
}
}
