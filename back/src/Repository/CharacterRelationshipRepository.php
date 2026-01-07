<?php
// src/Repository/CharacterRelationshipRepository.php

namespace App\Repository;

use App\Entity\Character;
use App\Entity\CharacterRelationship;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CharacterRelationshipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CharacterRelationship::class);
    }

    public function findOneByFromTo(Character $from, Character $to): ?CharacterRelationship
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.fromCharacter = :from')
            ->setParameter('from', $from)
            ->andWhere('r.toCharacter = :to')
            ->setParameter('to', $to)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findAffinityScoresFrom(Character $from, array $toIds): array
    {
        if (empty($toIds)) {
            return [];
        }

        $rows = $this->createQueryBuilder('r')
            ->select('IDENTITY(r.toCharacter) AS toId, r.affinityScore AS score')
            ->andWhere('r.fromCharacter = :from')
            ->andWhere('r.toCharacter IN (:toIds)')
            ->setParameter('from', $from)
            ->setParameter('toIds', $toIds)
            ->getQuery()
            ->getArrayResult();

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['toId']] = (int) $row['score'];
        }

        return $map;
    }

    // ✅ AJOUT: renvoyer directement les "connus" (relations existantes) avec l'entité Character join
    public function findKnownCharactersWithScore(Character $from): array
    {
        return $this->createQueryBuilder('r')
            ->innerJoin('r.toCharacter', 'c')
            ->addSelect('c')
            ->andWhere('r.fromCharacter = :from')
            ->setParameter('from', $from)
            ->orderBy('r.affinityScore', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
