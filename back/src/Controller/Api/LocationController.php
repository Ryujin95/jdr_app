<?php

namespace App\Controller\Api;

use App\Service\LocationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class LocationController extends AbstractController
{
    public function __construct(private LocationService $locationService) {}

    #[Route('/locations', name: 'api_locations_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $campaignIdRaw = $request->query->get('campaignId');
        if (!$campaignIdRaw || !is_numeric($campaignIdRaw)) {
            return $this->json(['message' => 'campaignId requis'], 400);
        }

        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $locations = $this->locationService->getLocationsForCurrentUser((int) $campaignIdRaw);
            return $this->json($locations, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }

    #[Route('/locations', name: 'api_locations_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $payload = json_decode($request->getContent() ?: '', true);
        if (!is_array($payload)) $payload = [];

        try {
            $created = $this->locationService->createLocation($payload, $user);
            return $this->json($created, 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }
}
