<?php

namespace App\Repository\Character;

use App\Entity\Character;
use App\Entity\User;
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
            ->leftJoin('c.owner', 'o')->addSelect('o')
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
            ->leftJoin('c.owner', 'o')->addSelect('o')
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
            ->leftJoin('c.owner', 'o')->addSelect('o')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', false)
            ->andWhere('l.id = :locationId')
            ->setParameter('locationId', $locationId)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Le perso joueur actif lié à un user (1 seul perso par user)
     */
    public function findActivePlayerCharacterByOwner(User $owner): ?Character
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', false)
            ->andWhere('c.isPlayer = :isPlayer')
            ->setParameter('isPlayer', true)
            ->andWhere('c.owner = :owner')
            ->setParameter('owner', $owner)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
