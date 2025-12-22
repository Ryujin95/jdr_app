<?php

namespace App\Service;

use App\Entity\Location;
use App\Repository\LocationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class LocationService
{
    public function __construct(
        private LocationRepository $locationRepository,
        private EntityManagerInterface $em,
        private Security $security,
    ) {}

    /**
     * Retourne la liste des lieux visibles pour l'utilisateur connecté.
     */
    public function getLocationsForCurrentUser(): array
    {
        $user = $this->security->getUser();

        if (!$user) {
            return [];
        }

        // méthode perso dans ton repository
        $locations = $this->locationRepository->findAllActive();

        $data = [];

        foreach ($locations as $location) {
            $data[] = [
                'id'          => $location->getId(),
                'name'        => $location->getName(),
                'description' => $location->getDescription(),
            ];
        }

        return $data;
    }

    /**
     * Crée un nouveau lieu à partir des données envoyées par le front.
     */
    public function createLocation(array $data): array
    {
        $name = trim($data['name'] ?? '');
        $description = isset($data['description'])
            ? trim($data['description'])
            : null;

        if ($name === '') {
            throw new \InvalidArgumentException('Le nom du lieu est obligatoire.');
        }

        $location = new Location();
        $location->setName($name);
        $location->setDescription($description);
        $location->setDeleted(false);

        $this->em->persist($location);
        $this->em->flush();

        return [
            'id'          => $location->getId(),
            'name'        => $location->getName(),
            'description' => $location->getDescription(),
        ];
    }
}
