<?php

namespace App\Service;

use App\Repository\UserRepository;
use App\Repository\CharacterRepository;
use App\Repository\LocationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TrashService
{
    public function __construct(
        private UserRepository $userRepository,
        private CharacterRepository $characterRepository,
        private LocationRepository $locationRepository,
        private EntityManagerInterface $em
    ) {}

    /**
     * Liste tout ce qui est envoyé dans le panier
     */
    public function getTrash(): array
    {
        $users = $this->userRepository->findAllDeleted();
        $characters = $this->characterRepository->findAllDeleted();
        $locations = $this->locationRepository->findAllDeleted();

        return [
            'users' => array_map(fn($u) => [
                'type'     => 'user',
                'id'       => $u->getId(),
                'email'    => $u->getEmail(),
                'username' => $u->getUsername(),
            ], $users),

            'characters' => array_map(fn($c) => [
                'type'      => 'character',
                'id'        => $c->getId(),
                'nickname'  => $c->getNickname(),
                'firstname' => $c->getFirstname(),
                'lastname'  => $c->getLastname(),
            ], $characters),

            'locations' => array_map(fn($l) => [
                'type' => 'location',
                'id'   => $l->getId(),
                'name' => $l->getName(),
            ], $locations),
        ];
    }

    /**
     * Déplacer un élément dans la corbeille (deleted = true)
     */
    public function moveToTrash(string $entity, int $id): void
    {
        $item = $this->getEntityItem($entity, $id);

        if (!method_exists($item, 'setDeleted')) {
            throw new \RuntimeException('Cette entité ne supporte pas le champ deleted.');
        }

        $item->setDeleted(true);
        $this->em->flush();
    }

    /**
     * Restaurer un élément supprimé (deleted = false)
     */
    public function restore(string $entity, int $id): void
    {
        $item = $this->getEntityItem($entity, $id);

        if (!method_exists($item, 'setDeleted')) {
            throw new \RuntimeException('Cette entité ne supporte pas le champ deleted.');
        }

        $item->setDeleted(false);
        $this->em->flush();
    }

    /**
     * Suppression définitive
     */
    public function forceDelete(string $entity, int $id): void
    {
        $item = $this->getEntityItem($entity, $id);

        $this->em->remove($item);
        $this->em->flush();
    }

    /**
     * Récupère l'entité demandée ou throw NotFound
     */
    private function getEntityItem(string $entity, int $id): object
    {
        $entity = strtolower(trim($entity));

        if ($entity === 'user') {
            $item = $this->userRepository->find($id);
        } elseif ($entity === 'character') {
            $item = $this->characterRepository->find($id);
        } elseif ($entity === 'location') {
            $item = $this->locationRepository->find($id);
        } else {
            throw new NotFoundHttpException("Type d'entité inconnu: {$entity}");
        }

        if (!$item) {
            throw new NotFoundHttpException("Élément introuvable: {$entity} #{$id}");
        }

        return $item;
    }
}
