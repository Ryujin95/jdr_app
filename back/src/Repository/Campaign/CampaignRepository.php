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
            ->select([
                'c.id AS id',
                'c.title AS title',
                'c.theme AS theme',
                'c.updatedAt AS updatedAt',
                'c.joinCode AS joinCode',
                'm.role AS role',

                // le point clé: récupérer l'id de la map liée à la campagne
                'IDENTITY(c.map) AS mapId',
            ]);
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
   // back/src/Repository/Campaign/CampaignRepository.php
public function findOneForUser(User $user, int $campaignId): ?array
{
    $row = $this->qbForUser($user)
        ->andWhere('c.id = :cid')
        ->setParameter('cid', $campaignId)
        ->setMaxResults(1)
        ->getQuery()
        ->getOneOrNullResult(\Doctrine\ORM\Query::HYDRATE_ARRAY);

    return is_array($row) ? $row : null;
}

}
