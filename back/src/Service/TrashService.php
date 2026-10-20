<?php

namespace App\Service;

use App\Entity\Character;
use App\Entity\Location;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\LocationRepository;
use App\Repository\Map\ZoneRepository;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class TrashService
{
    public function __construct(
        private UserRepository $userRepository,
        private CharacterRepository $characterRepository,
        private LocationRepository $locationRepository,
        private ZoneRepository $zoneRepository,
        private EntityManagerInterface $em,
        private Security $security,
        private CampaignAuthorization $campaignAuthorization,
        private ManagedMediaCleanupService $mediaCleanup,
    ) {}

    /**
     * @return array{users: array, characters: array, locations: array}
     */
    public function getTrash(User $actor, ?int $campaignId = null): array
    {
        $this->assertAuthenticatedActor($actor);
        if ($campaignId !== null) {
            $this->assertCampaignContext($campaignId);
        } elseif (!$this->security->isGranted('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException('campaignId requis pour consulter la corbeille.');
        }

        // Account administration stays global and is never granted by a campaign role.
        $users = $this->security->isGranted('ROLE_ADMIN')
            ? $this->userRepository->findAllDeleted()
            : [];

        $characters = $campaignId !== null
            ? $this->characterRepository->findDeletedInCampaign($campaignId)
            : [];
        $locations = $campaignId !== null
            ? $this->locationRepository->findDeletedByCampaign($campaignId)
            : [];

        return [
            'users' => array_map(static fn(User $user) => [
                'type' => 'user',
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'username' => $user->getUsername(),
            ], $users),
            'characters' => array_map(static fn(Character $character) => [
                'type' => 'character',
                'id' => $character->getId(),
                'nickname' => $character->getNickname(),
                'firstname' => $character->getFirstname(),
                'lastname' => $character->getLastname(),
            ], $characters),
            'locations' => array_map(static fn(Location $location) => [
                'type' => 'location',
                'id' => $location->getId(),
                'name' => $location->getName(),
            ], $locations),
        ];
    }

    public function moveToTrash(string $entity, int $id, ?int $campaignId, User $actor): void
    {
        $this->assertAuthenticatedActor($actor);
        $item = $this->getEntityItem($entity, $id);
        $this->assertItemPermission($item, $campaignId);
        $this->assertDeletedState($item, false);

        $this->em->wrapInTransaction(static function (EntityManagerInterface $em) use ($item): void {
            $item->setDeleted(true);
        });
    }

    public function restore(string $entity, int $id, ?int $campaignId, User $actor): void
    {
        $this->assertAuthenticatedActor($actor);
        $item = $this->getEntityItem($entity, $id);
        $this->assertItemPermission($item, $campaignId);
        $this->assertDeletedState($item, true);
        $this->assertCharacterCanBeRestored($item);

        $this->em->wrapInTransaction(static function (EntityManagerInterface $em) use ($item): void {
            $item->setDeleted(false);
        });
    }

    public function forceDelete(string $entity, int $id, ?int $campaignId, User $actor): void
    {
        $this->assertAuthenticatedActor($actor);
        $item = $this->getEntityItem($entity, $id);
        $this->assertItemPermission($item, $campaignId);
        $this->assertDeletedState($item, true);

        try {
            $this->em->wrapInTransaction(function (EntityManagerInterface $em) use ($item): void {
                if ($item instanceof Character) {
                    $this->deleteCharacterDependents($em, $item);
                } elseif ($item instanceof Location) {
                    $this->deleteLocationDependents($em, $item);
                }

                // User deletion keeps its restrictive foreign keys: the transaction
                // rolls back if account-linked data has not been resolved explicitly.
                $em->remove($item);
            });
        } catch (ForeignKeyConstraintViolationException $exception) {
            throw new ConflictHttpException(
                'La suppression est bloquée par des données encore liées à cet élément.',
                $exception,
            );
        } catch (UniqueConstraintViolationException $exception) {
            throw new ConflictHttpException(
                'L’opération créerait un doublon et a été annulée.',
                $exception,
            );
        }

        if ($item instanceof Character || $item instanceof User) {
            $avatarUrl = $item->getAvatarUrl();
            if (is_string($avatarUrl) && $avatarUrl !== '') {
                $this->mediaCleanup->cleanupAvatarAfterDeletion($avatarUrl);
            }
        }
    }

    private function deleteCharacterDependents(EntityManagerInterface $em, Character $character): void
    {
        foreach ([
            'DELETE FROM App\\Entity\\CharacterSkillValue v WHERE v.owner = :character',
            'DELETE FROM App\\Entity\\CharacterRelationship r WHERE r.fromCharacter = :character OR r.toCharacter = :character',
            'DELETE FROM App\\Entity\\CharacterKnowledge k WHERE k.target = :character',
            'DELETE FROM App\\Entity\\CharacterSecret s WHERE s.owner = :character',
            'DELETE FROM App\\Entity\\Map\\CharacterZonePosition p WHERE p.character = :character',
        ] as $dql) {
            $em->createQuery($dql)
                ->setParameter('character', $character)
                ->execute();
        }
    }

    private function deleteLocationDependents(EntityManagerInterface $em, Location $location): void
    {
        // Keep characters and their other data, but remove the location assignment.
        $locationCampaignId = $location->getCampaign()?->getId();
        foreach ($em->getRepository(Character::class)->findBy(['location' => $location]) as $character) {
            $characterCampaignId = $character->getCampaign()?->getId();
            if ($characterCampaignId !== null && $characterCampaignId !== $locationCampaignId) {
                throw new ConflictHttpException(
                    'Le lieu est encore lié à un personnage d’une autre campagne.',
                );
            }
            $character->setLocation(null);
        }

        // Zones belong to the removed location; foreign campaign links abort the transaction.
        foreach ($this->zoneRepository->findBy(['location' => $location]) as $zone) {
            $zoneCampaignId = $zone->getMap()?->getCampaign()?->getId();
            if ($zoneCampaignId !== $locationCampaignId) {
                throw new ConflictHttpException(
                    'Le lieu est encore lié à une zone d’une autre campagne.',
                );
            }

            $em->createQuery('DELETE FROM App\\Entity\\Map\\CharacterZonePosition p WHERE p.zone = :zone')
                ->setParameter('zone', $zone)
                ->execute();
            $em->remove($zone);
        }
    }

    private function assertAuthenticatedActor(User $actor): void
    {
        $current = $this->security->getUser();
        if (!$current instanceof User || $actor->getId() === null || $current->getId() !== $actor->getId()) {
            throw new AccessDeniedHttpException('Acteur non authentifié.');
        }
    }

    private function assertCampaignContext(int $campaignId): void
    {
        if ($campaignId <= 0) {
            throw new \InvalidArgumentException('campaignId invalide.');
        }

        // The shared authorization service permits the validated global admin exception;
        // campaign MJ rights remain scoped to the actual resource campaign.
        $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
    }

    private function assertItemPermission(object $item, ?int $campaignId): void
    {
        if ($item instanceof User) {
            if (!$this->security->isGranted('ROLE_ADMIN')) {
                throw new AccessDeniedHttpException('La gestion des comptes est réservée à l’administration.');
            }
            return;
        }

        if (!$item instanceof Character && !$item instanceof Location) {
            throw new NotFoundHttpException('Type d’entité inconnu.');
        }

        $campaign = $this->campaignAuthorization->assertResourceRole($item, ['MJ']);
        if ($campaignId !== null) {
            $this->campaignAuthorization->assertResourceBelongsToCampaign($item, $campaignId);
        }
    }

    private function assertDeletedState(object $item, bool $expected): void
    {
        if (!method_exists($item, 'isDeleted') || !method_exists($item, 'setDeleted')) {
            throw new NotFoundHttpException('Type d’entité non pris en charge par la corbeille.');
        }

        if ($item->isDeleted() !== $expected) {
            throw new ConflictHttpException($expected
                ? 'L’élément doit être supprimé avant cette opération.'
                : 'L’élément est déjà dans la corbeille.');
        }
    }

    private function assertCharacterCanBeRestored(object $item): void
    {
        if (!$item instanceof Character || !$item->isPlayer()) {
            return;
        }

        $owner = $item->getOwner();
        $campaign = $item->getCampaign();
        if ($owner === null || $campaign === null || $campaign->getId() === null) {
            return;
        }

        if ($this->characterRepository->findActivePlayerCharacterByOwnerInCampaign(
            $owner,
            (int) $campaign->getId(),
        ) !== null) {
            throw new ConflictHttpException(
                'Un personnage actif appartient déjà à ce joueur dans cette campagne.',
            );
        }
    }

    private function getEntityItem(string $entity, int $id): object
    {
        if ($id <= 0) {
            throw new \InvalidArgumentException('Identifiant invalide.');
        }

        $entity = strtolower(trim($entity));
        if (!in_array($entity, ['user', 'character', 'location'], true)) {
            throw new \InvalidArgumentException('Type d’entité invalide.');
        }
        // Check account-administration rights before even looking up the account ID.
        if ($entity === 'user' && !$this->security->isGranted('ROLE_ADMIN')) {
            throw new AccessDeniedHttpException('La gestion des comptes est réservée à l’administration.');
        }
        $item = match ($entity) {
            'user' => $this->userRepository->find($id),
            'character' => $this->characterRepository->find($id),
            'location' => $this->locationRepository->find($id),
            default => throw new \LogicException('Un type de corbeille validé est attendu.'),
        };

        if (!$item) {
            throw new NotFoundHttpException('Élément introuvable.');
        }

        return $item;
    }
}
