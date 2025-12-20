<?php

namespace App\Service;

use App\Repository\LocationRepository;
use Symfony\Bundle\SecurityBundle\Security;

class LocationViewService
{
    public function __construct(
        private LocationRepository $locationRepository,
        private Security $security,
    ) {}

    public function getLocationsForCurrentUser(): array
    {
        $user = $this->security->getUser();

        if (!$user) {
            return [];
        }

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
}
