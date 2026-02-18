<?php
// back/src/Repository/Map/ZoneRepository.php

namespace App\Repository\Map;

use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ZoneRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Zone::class);
    }

    /** @return Zone[] */
    public function findVisibleByMap(Map $map): array
    {
        return $this->createQueryBuilder('z')
            ->leftJoin('z.location', 'l')
            ->andWhere('z.map = :map')->setParameter('map', $map)
            ->andWhere('z.enabled = 1')
            ->andWhere('z.location IS NOT NULL')          // <- on évite les zones orphelines (cause principale de ton doublon)
            ->andWhere('(l.deleted = 0)')                 // <- on cache ce qui est en corbeille
            ->orderBy('z.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** @return Zone[] */
    public function findByLocationId(int $locationId): array
    {
        return $this->createQueryBuilder('z')
            ->leftJoin('z.location', 'l')
            ->andWhere('l.id = :id')->setParameter('id', $locationId)
            ->getQuery()
            ->getResult();
    }

    public function deleteByLocationId(int $locationId): int
    {
        return $this->createQueryBuilder('z')
            ->delete()
            ->where('z.location = :locId')
            ->setParameter('locId', $locationId)
            ->getQuery()
            ->execute();
    }
}
