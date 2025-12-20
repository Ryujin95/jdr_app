<?php

namespace App\Repository;

use App\Entity\Character;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Character>
 */
class CharacterRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Character::class);
    }

    /**
     * Tous les persos non supprimés
     */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', false)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Tous les persos supprimés (pour la corbeille)
     */
    public function findAllDeleted(): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', true)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Persos non supprimés dans un lieu donné
     */
    public function findByLocationIdActive(int $locationId): array
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.location', 'l')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', false)
            ->andWhere('l.id = :locationId')
            ->setParameter('locationId', $locationId)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
