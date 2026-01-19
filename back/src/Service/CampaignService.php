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
                'joinCode' => $r['joinCode'] ?? null,
            ];
        }, $rows);
    }

    public function createCampaign(User $creator, string $title, ?string $theme): Campaign
    {
        $campaign = new Campaign();
        $campaign->setTitle($title);
        $campaign->setTheme($theme);

        // Génère automatiquement un code unique (ex: 75J867)
        if (method_exists($campaign, 'setJoinCode')) {
            $campaign->setJoinCode($this->generateUniqueJoinCode(6));
        }

        $member = new CampaignMember();
        $member->setUser($creator);
        $member->setRole(CampaignMember::ROLE_MJ);

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

        // Déjà membre ? on renvoie la campagne sans re-créer
        foreach ($campaign->getMembers() as $m) {
            if ($m->getUser() && $m->getUser()->getId() === $user->getId()) {
                return $campaign;
            }
        }

        $member = new CampaignMember();
        $member->setUser($user);
        $member->setRole(CampaignMember::ROLE_PLAYER);

        $campaign->addMember($member);

        $this->em->persist($member);
        $this->em->flush();

        return $campaign;
    }

    private function generateUniqueJoinCode(int $length = 6): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // évite 0/O/I/1
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

}
