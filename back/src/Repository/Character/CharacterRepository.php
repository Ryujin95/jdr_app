<?php

namespace App\Repository\Character;

use App\Entity\Character;
use App\Entity\User;
use App\Entity\CharacterRelationship;
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

    /**
     * Candidats ajoutables comme "connu" pour un personnage dans une campagne donnée
     * - même campagne
     * - non supprimés
     * - exclut le personnage source
     * - exclut ceux déjà en relation (from -> to)
     */
    public function findCandidatesForKnownInCampaign(int $campaignId, int $fromCharacterId): array
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.owner', 'o')->addSelect('o')
            ->andWhere('c.deleted = :deleted')
            ->setParameter('deleted', false)
            ->andWhere('IDENTITY(c.campaign) = :campaignId')
            ->setParameter('campaignId', $campaignId)
            ->andWhere('c.id != :fromId')
            ->setParameter('fromId', $fromCharacterId)

            // Exclure ceux déjà connus : relation existante fromCharacter=fromId et toCharacter=c
            ->leftJoin(
                CharacterRelationship::class,
                'r',
                'WITH',
                'r.fromCharacter = :fromId AND r.toCharacter = c'
            )
            ->andWhere('r.id IS NULL')

            ->orderBy('c.nickname', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
