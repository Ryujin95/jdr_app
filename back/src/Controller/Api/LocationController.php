<?php

namespace App\Controller\Api;

use App\Service\LocationViewService;
use App\Repository\LocationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api')]
class LocationController extends AbstractController
{
    public function __construct(
        private LocationViewService $locationViewService,
    ) {}

    #[Route('/locations', name: 'api_locations_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $locations = $this->locationViewService->getLocationsForCurrentUser();

        return new JsonResponse($locations, 200);
    }

    #[Route('/locations/{id}/trash', name: 'api_locations_trash', methods: ['PATCH'])]
    public function trash(
        int $id,
        LocationRepository $locationRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        // Sécurité MJ/Admin uniquement
        if (
            !$this->isGranted('ROLE_ADMIN') &&
            !$this->isGranted('ROLE_MJ')
        ) {
            throw new AccessDeniedException('Permission denied');
        }

        $location = $locationRepository->find($id);

        if (!$location) {
            return new JsonResponse(['message' => 'Location not found'], 404);
        }

        if ($location->isDeleted()) {
            return new JsonResponse(['message' => 'Already deleted'], 400);
        }

        $location->setDeleted(true);
        $em->flush();

        return new JsonResponse(['message' => 'Location moved to trash'], 200);
    }
}
