<?php

namespace App\Repository\Map;

use App\Entity\Map\Map;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class MapRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Map::class);
    }

    /**
     * @return Map[]
     */
    public function findEnabled(): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.enabled = :enabled')
            ->setParameter('enabled', true)
            ->orderBy('m.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
