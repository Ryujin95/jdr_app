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

    /** Deleted characters belonging to one campaign. */
    public function findDeletedInCampaign(int $campaignId): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.deleted = :deleted')
            ->andWhere('IDENTITY(c.campaign) = :campaignId')
            ->setParameter('deleted', true)
            ->setParameter('campaignId', $campaignId)
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

    /** Non-deleted characters visible in a specific campaign. */
    public function findActiveInCampaign(int $campaignId): array
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.owner', 'o')->addSelect('o')
            ->andWhere('c.deleted = :deleted')
            ->andWhere('IDENTITY(c.campaign) = :campaignId')
            ->setParameter('deleted', false)
            ->setParameter('campaignId', $campaignId)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Non-deleted characters in a location and its campaign. */
    public function findByLocationAndCampaignActive(int $locationId, int $campaignId): array
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.location', 'l')
            ->leftJoin('c.owner', 'o')->addSelect('o')
            ->andWhere('c.deleted = :deleted')
            ->andWhere('l.id = :locationId')
            ->andWhere('IDENTITY(c.campaign) = :campaignId')
            ->setParameter('deleted', false)
            ->setParameter('locationId', $locationId)
            ->setParameter('campaignId', $campaignId)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @param list<int> $locationIds
     *  @return list<Character>
     */
    public function findActiveByLocationIds(array $locationIds): array
    {
        $locationIds = array_values(array_unique(array_filter(
            array_map('intval', $locationIds),
            static fn (int $id): bool => $id > 0,
        )));
        if ($locationIds === []) {
            return [];
        }

        return $this->createQueryBuilder('c')
            ->leftJoin('c.location', 'location')->addSelect('location')
            ->leftJoin('c.campaign', 'campaign')->addSelect('campaign')
            ->leftJoin('location.campaign', 'locationCampaign')->addSelect('locationCampaign')
            ->andWhere('c.deleted = :deleted')
            ->andWhere('IDENTITY(c.location) IN (:locationIds)')
            ->setParameter('deleted', false)
            ->setParameter('locationIds', $locationIds)
            ->orderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Returns an active player character owned by this user in this campaign. */
    public function findActivePlayerCharacterByOwnerInCampaign(
        User $owner,
        int $campaignId,
        ?Character $except = null,
    ): ?Character {
        $query = $this->createQueryBuilder('c')
            ->andWhere('c.deleted = :deleted')
            ->andWhere('c.isPlayer = :isPlayer')
            ->andWhere('c.owner = :owner')
            ->andWhere('IDENTITY(c.campaign) = :campaignId')
            ->setParameter('deleted', false)
            ->setParameter('isPlayer', true)
            ->setParameter('owner', $owner)
            ->setParameter('campaignId', $campaignId);

        if ($except?->getId() !== null) {
            $query->andWhere('c.id != :exceptId')
                ->setParameter('exceptId', $except->getId());
        }

        return $query->setMaxResults(1)
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
