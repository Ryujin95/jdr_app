<?php
// back/src/Repository/Map/CharacterZonePositionRepository.php

namespace App\Repository\Map;

use App\Entity\Map\CharacterZonePosition;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CharacterZonePositionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CharacterZonePosition::class);
    }

    public function findOneByZoneAndCharacter(int $zoneId, int $characterId): ?CharacterZonePosition
{
    return $this->createQueryBuilder('p')
        ->andWhere('IDENTITY(p.zone) = :z')
        ->andWhere('IDENTITY(p.character) = :c')
        ->setParameter('z', $zoneId)
        ->setParameter('c', $characterId)
        ->getQuery()
        ->getOneOrNullResult();
}

    public function findByZoneIndexed(int $zoneId): array
    {
        $rows = $this->createQueryBuilder('p')
            ->leftJoin('p.character', 'c')->addSelect('c')
            ->andWhere('p.zone = :z')->setParameter('z', $zoneId)
            ->getQuery()
            ->getResult();

        $out = [];
        foreach ($rows as $p) {
            $cid = $p->getCharacter()?->getId();
            if ($cid) $out[(int)$cid] = $p;
        }
        return $out;
    }

    public function findByZoneId(int $zoneId): array
{
    return $this->createQueryBuilder('p')
        ->addSelect('c')
        ->join('p.character', 'c')
        ->andWhere('p.zone = :z')->setParameter('z', $zoneId)
        ->getQuery()
        ->getResult();
}
}
