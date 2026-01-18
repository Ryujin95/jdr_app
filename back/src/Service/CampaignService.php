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

        // Format attendu par ton DashboardPage (id, title, theme, role, updatedAt)
        return array_map(static function (array $r) {
            return [
                'id' => (int) $r['id'],
                'title' => (string) $r['title'],
                'theme' => $r['theme'] !== null ? (string) $r['theme'] : null,
                'role' => (string) $r['role'],
                'updatedAt' => $r['updatedAt'] instanceof \DateTimeInterface ? $r['updatedAt']->format(\DateTimeInterface::ATOM) : null,
            ];
        }, $rows);
    }

    public function createCampaign(User $creator, string $title, ?string $theme): Campaign
    {
        $campaign = new Campaign();
        $campaign->setTitle($title);
        $campaign->setTheme($theme);

        $member = new CampaignMember();
        $member->setUser($creator);
        $member->setRole(CampaignMember::ROLE_MJ);

        $campaign->addMember($member);

        $this->em->persist($campaign);
        $this->em->persist($member);
        $this->em->flush();

        return $campaign;
    }
}
