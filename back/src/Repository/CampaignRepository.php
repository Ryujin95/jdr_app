<?php
// back/src/Repository/CampaignRepository.php

namespace App\Repository;

use App\Entity\Campaign;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CampaignRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Campaign::class);
    }

    /** @return array<int, array<string, mixed>> */
    public function findForUser(User $user): array
    {
        return $this->createQueryBuilder('c')
            // MODIF: ajout joinCode pour éviter un 2e appel juste pour le code
            ->select('c.id, c.title, c.theme, c.joinCode, c.updatedAt, m.role')
            ->innerJoin('c.members', 'm')
            ->andWhere('m.user = :user')
            ->setParameter('user', $user)
            ->orderBy('c.updatedAt', 'DESC')
            ->getQuery()
            ->getArrayResult();
    }

   // back/src/Repository/CampaignRepository.php

/** @return array<string, mixed>|null */
public function findOneForUser(User $user, int $campaignId): ?array
{
    return $this->createQueryBuilder('c')
        ->select('c.id, c.title, c.theme, c.joinCode, c.updatedAt, m.role')
        ->innerJoin('c.members', 'm')
        ->andWhere('c.id = :id')
        ->andWhere('m.user = :user')
        ->setParameter('id', $campaignId)
        ->setParameter('user', $user)
        ->setMaxResults(1)
        ->getQuery()
        ->getOneOrNullResult(\Doctrine\ORM\Query::HYDRATE_ARRAY);
}

}
