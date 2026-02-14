<?php
// back/src/Service/CampaignService.php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\Map\Map;
use App\Entity\User;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Map\MapRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class CampaignService
{
    public function __construct(
        private EntityManagerInterface $em,
        private CampaignRepository $campaignRepo,
        private MapRepository $mapRepo,
        private string $projectDir,
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
        $campaign = $this->getForUser($user, $campaignId);

        if (!$campaign) {
            throw new \RuntimeException('Campagne introuvable.');
        }

        $this->em->remove($campaign);
        $this->em->flush();
    }

    // ✅ CAS SIMPLE: création campagne SANS map
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


    // ✅ CAS OPTIONNEL: lier une map existante après coup
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

    // ✅ CAS OPTIONNEL: création map + upload image (si tu veux garder la méthode pour plus tard)
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

        foreach ($campaign->getMembers() as $m) {
            if ($m->getUser() && $m->getUser()->getId() === $user->getId()) {
                return $campaign;
            }
        }

        $member = new CampaignMember();
        $member->setUser($user);
        $member->setRole('Player');

        $campaign->addMember($member);

        $this->em->persist($member);
        $this->em->flush();

        return $campaign;
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

    /** @return array<string, mixed> */
   // back/src/Service/CampaignService.php
// back/src/Service/CampaignService.php

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


}
