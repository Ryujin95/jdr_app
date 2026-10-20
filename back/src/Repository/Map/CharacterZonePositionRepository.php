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

    /** @param list<int> $zoneIds
     *  @return array<int, array<int, array{xPercent: float, yPercent: float}>>
     */
    public function findIndexedByZoneIds(array $zoneIds): array
    {
        $zoneIds = array_values(array_unique(array_filter(
            array_map('intval', $zoneIds),
            static fn (int $id): bool => $id > 0,
        )));
        if ($zoneIds === []) {
            return [];
        }

        $rows = $this->createQueryBuilder('p')
            ->select('IDENTITY(p.zone) AS zoneId')
            ->addSelect('IDENTITY(p.character) AS characterId')
            ->addSelect('p.xPercent AS xPercent, p.yPercent AS yPercent')
            ->andWhere('IDENTITY(p.zone) IN (:zoneIds)')
            ->setParameter('zoneIds', $zoneIds)
            ->getQuery()
            ->getArrayResult();

        $out = [];
        foreach ($rows as $row) {
            $zoneId = (int) $row['zoneId'];
            $characterId = (int) $row['characterId'];
            $out[$zoneId][$characterId] = [
                'xPercent' => (float) $row['xPercent'],
                'yPercent' => (float) $row['yPercent'],
            ];
        }

        return $out;
    }

    public function findByZoneId(int $zoneId): array
{
    return $this->createQueryBuilder('p')
        ->leftJoin('p.zone', 'z')->addSelect('z')
        ->addSelect('c')
        ->join('p.character', 'c')
        ->leftJoin('c.campaign', 'campaign')->addSelect('campaign')
        ->leftJoin('c.location', 'location')->addSelect('location')
        ->leftJoin('location.campaign', 'locationCampaign')->addSelect('locationCampaign')
        ->andWhere('p.zone = :z')->setParameter('z', $zoneId)
        ->getQuery()
        ->getResult();
}
}
