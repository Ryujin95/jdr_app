<?php
// back/src/Service/CampaignService.php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\User;
use App\Repository\CampaignRepository;
use Doctrine\ORM\EntityManagerInterface;

class CampaignService
{
    public function __construct(
        private EntityManagerInterface $em,
        private CampaignRepository $campaignRepo
    ) {}

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user): array
    {
        $rows = $this->campaignRepo->findForUser($user);

        return array_map(static function (array $r) {
            return [
                'id' => (int) $r['id'],
                'title' => (string) $r['title'],
                'theme' => $r['theme'] !== null ? (string) $r['theme'] : null,
                'role' => (string) $r['role'],
                'updatedAt' => $r['updatedAt'] instanceof \DateTimeInterface
                    ? $r['updatedAt']->format(\DateTimeInterface::ATOM)
                    : null,

                // ✅ MODIF: joinCode ne peut exister ici QUE si le repository le SELECT.
                // Si ton repository n’a pas joinCode, laisse null (ou corrige le repo).
                'joinCode' => array_key_exists('joinCode', $r) ? $r['joinCode'] : null,
            ];
        }, $rows);
    }

    public function createCampaign(User $creator, string $title, ?string $theme): Campaign
    {
        $campaign = new Campaign();
        $campaign->setTitle($title);
        $campaign->setTheme($theme);

        // ✅ MODIF: ton entité Campaign a bien getJoinCode/setJoinCode, donc pas besoin de method_exists.
        $campaign->setJoinCode($this->generateUniqueJoinCode(6));

        $member = new CampaignMember();
        $member->setUser($creator);

        // ✅ MODIF: ton CampaignMember stocke 'MJ' / 'Player' (string). Pas de constantes dans ton fichier.
        $member->setRole('MJ');

        $campaign->addMember($member);

        $this->em->persist($campaign);
        $this->em->persist($member);
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

        // ✅ MODIF: pareil, role en string
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
            if (!$exists) return $code;
        }

        throw new \RuntimeException('Impossible de générer un code unique.');
    }

    public function getForUser(User $user, int $campaignId): Campaign
    {
        $campaign = $this->campaignRepo->find($campaignId);
        if (!$campaign) {
            throw new \RuntimeException('Campaign not found');
        }

        $isMember = false;
        foreach ($campaign->getMembers() as $m) {
            if ($m->getUser() && $m->getUser()->getId() === $user->getId()) {
                $isMember = true;
                break;
            }
        }

        if (!$isMember) {
            throw new \InvalidArgumentException('Forbidden');
        }

        return $campaign;
    }

    // ✅ MODIF (optionnel mais très utile): si tu veux faire "tout en un coup" côté front,
    // tu peux appeler CE service pour renvoyer joinCode + role en même temps,
    // sans faire 2 fetch et sans fusion côté React.
    /** @return array<string, mixed> */
    // back/src/Service/CampaignService.php

public function getForUserData(User $user, int $campaignId): array
{
    // ✅ MODIF: on récupère campagne + role en 1 requête (pas besoin de faire /campaigns puis /campaigns/{id})
    $row = $this->campaignRepo->findOneForUser($user, $campaignId);

    if (!$row) {
        // soit campagne inexistante, soit pas membre
        // on peut distinguer, mais là on fait simple
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
        'role' => (string) $row['role'], // ✅ clé: MJ / Player
    ];
}

}
