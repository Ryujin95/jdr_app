<?php
// src/Repository/Campaign/CampaignMemberRepository.php

namespace App\Repository\Campaign;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

final class CampaignMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CampaignMember::class);
    }

    public function findOneByCampaignAndUser(Campaign $campaign, User $user): ?CampaignMember
    {
        return $this->createQueryBuilder('cm')
            ->andWhere('cm.campaign = :campaign')
            ->andWhere('cm.user = :user')
            ->setParameter('campaign', $campaign)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function getRoleForUserInCampaign(int $campaignId, int $userId): ?string
    {
        $role = $this->createQueryBuilder('cm')
            ->select('cm.role')
            ->andWhere('cm.campaign = :campaignId')
            ->andWhere('cm.user = :userId')
            ->setParameter('campaignId', $campaignId)
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getOneOrNullResult();

        return $role['role'] ?? null;
    }

    public function isUserMjInCampaign(int $campaignId, int $userId): bool
    {
        $count = (int) $this->createQueryBuilder('cm')
            ->select('COUNT(cm.id)')
            ->andWhere('cm.campaign = :campaignId')
            ->andWhere('cm.user = :userId')
            ->andWhere('cm.role = :role')
            ->setParameter('campaignId', $campaignId)
            ->setParameter('userId', $userId)
            ->setParameter('role', 'MJ')
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    public function findMembersForCampaign(int $campaignId): array
    {
        return $this->createQueryBuilder('cm')
            ->select('cm.id, cm.role, u.id AS userId, u.email AS email, u.username AS username')
            ->innerJoin('cm.user', 'u')
            ->andWhere('cm.campaign = :campaignId')
            ->setParameter('campaignId', $campaignId)
            ->orderBy('cm.role', 'DESC')
            ->addOrderBy('u.username', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }

    public function findMyCampaignView(int $campaignId, int $userId): ?array
    {
        $row = $this->createQueryBuilder('cm')
            ->select('c.id, c.title, c.theme, c.joinCode, cm.role')
            ->innerJoin('cm.campaign', 'c')
            ->andWhere('c.id = :campaignId')
            ->andWhere('cm.user = :userId')
            ->setParameter('campaignId', $campaignId)
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getOneOrNullResult();

        return is_array($row) ? $row : null;
    }

    /**
     * Liste des joueurs de la campagne qui n'ont pas encore de personnage joueur actif dans cette campagne.
     * Retour format array simple pour ton select front.
     */
    public function findAvailablePlayersWithoutCharacter(int $campaignId): array
    {
        return $this->createQueryBuilder('cm')
            ->select('u.id AS id, u.email AS email, u.username AS username')
            ->innerJoin('cm.user', 'u')
            ->leftJoin(
                'App\Entity\Character',
                'c',
                'WITH',
                'c.owner = u AND c.deleted = false AND c.isPlayer = true AND IDENTITY(c.campaign) = :campaignId'
            )
            ->andWhere('cm.campaign = :campaignId')
            ->andWhere('cm.role = :role')
            ->andWhere('c.id IS NULL')
            ->setParameter('campaignId', $campaignId)
            ->setParameter('role', 'Player')
            ->orderBy('u.username', 'ASC')
            ->getQuery()
            ->getArrayResult();
    }
}
