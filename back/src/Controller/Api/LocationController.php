<?php

namespace App\Controller\Api;

use App\Service\LocationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api')]
class LocationController extends AbstractController
{
    public function __construct(
        private LocationService $locationService,
    ) {
    }

    #[Route('/locations', name: 'api_locations_index', methods: ['GET'])]
public function index(Request $request): JsonResponse
{
    $campaignId = $request->query->get('campaignId');

    if (!$campaignId || !is_numeric($campaignId)) {
        return new JsonResponse(['message' => 'campaignId requis'], 400);
    }

    $locations = $this->locationService
        ->getLocationsForCurrentUser((int) $campaignId);

    return new JsonResponse($locations, 200);
}


    #[Route('/locations', name: 'api_locations_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if (
            !$this->isGranted('ROLE_ADMIN') &&
            !$this->isGranted('ROLE_MJ')
        ) {
            throw new AccessDeniedException('Permission denied');
        }

        $payload = json_decode($request->getContent(), true) ?? [];

        try {
            $created = $this->locationService->createLocation($payload);
            return new JsonResponse($created, 201);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }
    }

        #[Route('/api/locations', name: 'api_locations_list', methods: ['GET'])]
        public function list(Request $request): JsonResponse
        {
            $campaignIdRaw = $request->query->get('campaignId');
            $campaignId = is_numeric($campaignIdRaw) ? (int) $campaignIdRaw : null;

            try {
                return $this->json($this->locationService->getLocationsForCurrentUser($campaignId), 200);
            } catch (\InvalidArgumentException $e) {
                return $this->json(['message' => $e->getMessage()], 400);
            }
        }

}
