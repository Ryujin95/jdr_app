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

    /** Includes editable and disabled zones, but hides zones whose location is in trash. */
    public function findForMapEditor(Map $map): array
    {
        return $this->createQueryBuilder('z')
            ->leftJoin('z.map', 'map')->addSelect('map')
            ->leftJoin('map.campaign', 'mapCampaign')->addSelect('mapCampaign')
            ->leftJoin('z.location', 'l')->addSelect('l')
            ->leftJoin('l.campaign', 'locationCampaign')->addSelect('locationCampaign')
            ->andWhere('z.map = :map')
            ->andWhere('(z.location IS NULL OR l.deleted = :deleted)')
            ->setParameter('map', $map)
            ->setParameter('deleted', false)
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
