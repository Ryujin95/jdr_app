<?php

namespace App\Repository;

use App\Entity\Location;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Location>
 */
class LocationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Location::class);
    }

    /**
     * Lieux non supprimés (TOUS) - à éviter si tu veux séparer par campagne
     */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('l')
            ->andWhere('l.deleted = :deleted')
            ->setParameter('deleted', false)
            ->orderBy('l.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Lieux supprimés (corbeille) (TOUS) - à éviter si tu veux séparer par campagne
     */
    public function findAllDeleted(): array
    {
        return $this->createQueryBuilder('l')
            ->andWhere('l.deleted = :deleted')
            ->setParameter('deleted', true)
            ->orderBy('l.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Lieux non supprimés, filtrés par campagne
     * $includeNull: si true, inclut aussi les lieux sans campagne (campaign IS NULL)
     */
    public function findActiveByCampaign(int $campaignId, bool $includeNull = false): array
    {
        $qb = $this->createQueryBuilder('l')
            ->andWhere('l.deleted = :deleted')
            ->setParameter('deleted', false)
            ->orderBy('l.id', 'ASC');

        if ($includeNull) {
            $qb->andWhere('(l.campaign = :cid OR l.campaign IS NULL)')
               ->setParameter('cid', $campaignId);
        } else {
            $qb->andWhere('l.campaign = :cid')
               ->setParameter('cid', $campaignId);
        }

        return $qb->getQuery()->getResult();
    }

    // back/src/Repository/LocationRepository.php

public function findActiveByCampaignId(int $campaignId): array
{
    return $this->createQueryBuilder('l')
        ->andWhere('l.deleted = :deleted')
        ->setParameter('deleted', false)
        ->andWhere('l.campaign = :campaignId')
        ->setParameter('campaignId', $campaignId)
        ->orderBy('l.id', 'ASC')
        ->getQuery()
        ->getResult();
}

    /**
     * Lieux supprimés (corbeille), filtrés par campagne
     * $includeNull: si true, inclut aussi les lieux sans campagne (campaign IS NULL)
     */
    public function findDeletedByCampaign(int $campaignId, bool $includeNull = false): array
    {
        $qb = $this->createQueryBuilder('l')
            ->andWhere('l.deleted = :deleted')
            ->setParameter('deleted', true)
            ->orderBy('l.id', 'ASC');

        if ($includeNull) {
            $qb->andWhere('(l.campaign = :cid OR l.campaign IS NULL)')
               ->setParameter('cid', $campaignId);
        } else {
            $qb->andWhere('l.campaign = :cid')
               ->setParameter('cid', $campaignId);
        }

        return $qb->getQuery()->getResult();
    }
}
