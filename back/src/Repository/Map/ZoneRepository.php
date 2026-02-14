<?php
// back/src/Repository/Map/ZoneRepository.php

namespace App\Repository\Map;

use App\Entity\Map\Zone;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Zone>
 */
class ZoneRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Zone::class);
    }

    /**
     * @return Zone[]
     */
    public function findByMapId(int $mapId): array
    {
        return $this->createQueryBuilder('z')
            ->andWhere('z.map = :mapId')
            ->setParameter('mapId', $mapId)
            ->orderBy('z.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByMapIdAndCode(int $mapId, string $code): ?Zone
    {
        return $this->createQueryBuilder('z')
            ->andWhere('z.map = :mapId')
            ->andWhere('z.code = :code')
            ->setParameter('mapId', $mapId)
            ->setParameter('code', $code)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
