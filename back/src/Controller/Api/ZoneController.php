<?php
// back/src/Controller/Api/ZoneController.php

namespace App\Controller\Api;

use App\Service\ZoneService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/zones')]
class ZoneController extends AbstractController
{
    public function __construct(private ZoneService $zoneService) {}

    #[Route('', name: 'api_zones_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $mapId = $request->query->get('mapId');
        if (!is_numeric($mapId)) {
            return $this->json(['message' => 'mapId requis'], 400);
        }

        $zones = $this->zoneService->listByMap((int)$mapId);
        return $this->json($zones, 200);
    }

    #[Route('', name: 'api_zones_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent() ?: '', true);
        if (!is_array($data)) $data = [];

        try {
            $zone = $this->zoneService->create($data);
            return $this->json($zone, 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }
}
