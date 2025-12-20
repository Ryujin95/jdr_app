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
     * Lieux non supprimés
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
     * Lieux supprimés (corbeille)
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
}
