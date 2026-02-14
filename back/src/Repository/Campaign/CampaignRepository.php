<?php
// back/src/Repository/CampaignRepository.php

namespace App\Repository\Campaign;

use App\Entity\Campaign;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Doctrine\ORM\QueryBuilder;

class CampaignRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Campaign::class);
    }

    private function qbForUser(User $user): QueryBuilder
    {
        return $this->createQueryBuilder('c')
            ->innerJoin('c.members', 'm')
            ->andWhere('m.user = :user')
            ->setParameter('user', $user)
            ->select('c.id, c.title, c.theme, c.joinCode, c.updatedAt, m.role');
    }

    /** @return array<int, array<string, mixed>> */
    public function findForUser(User $user): array
    {
        return $this->qbForUser($user)
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getArrayResult();
    }

    /** @return array<string, mixed>|null */
    public function findOneForUser(User $user, int $campaignId): ?array
    {
        return $this->qbForUser($user)
            ->andWhere('c.id = :id')
            ->setParameter('id', $campaignId)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult(\Doctrine\ORM\Query::HYDRATE_ARRAY);
    }
}
