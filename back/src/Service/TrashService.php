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
     * Restaurer un élément supprimé
     */
    public function restore(string $entity, int $id): void
    {
        $entity = strtolower($entity);

        if ($entity === 'user') {
            $item = $this->userRepository->find($id);
        } elseif ($entity === 'character') {
            $item = $this->characterRepository->find($id);
        } elseif ($entity === 'location') {
            $item = $this->locationRepository->find($id);
        } else {
            throw new NotFoundHttpException('Type d\'entité inconnu.');
        }

        if (!$item) {
            throw new NotFoundHttpException('Élément introuvable pour restauration.');
        }

        $item->setDeleted(false);

        $this->em->flush();
    }

    /**
     * Suppression définitive
     */
    public function forceDelete(string $entity, int $id): void
    {
        $entity = strtolower($entity);

        if ($entity === 'user') {
            $item = $this->userRepository->find($id);
        } elseif ($entity === 'character') {
            $item = $this->characterRepository->find($id);
        } elseif ($entity === 'location') {
            $item = $this->locationRepository->find($id);
        } else {
            throw new NotFoundHttpException('Type d\'entité inconnu pour suppression définitive.');
        }

        if (!$item) {
            throw new NotFoundHttpException('Élément introuvable.');
        }

        $this->em->remove($item);
        $this->em->flush();
    }
}
