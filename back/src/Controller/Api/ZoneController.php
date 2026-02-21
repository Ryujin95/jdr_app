<?php

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

        return $this->json($this->zoneService->listByMap((int) $mapId), 200);
    }

    #[Route('', name: 'api_zones_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent() ?: '', true);
        if (!is_array($data)) $data = [];

        try {
            return $this->json($this->zoneService->create($data), 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }

    #[Route('/{id}', name: 'api_zones_update', methods: ['PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent() ?: '', true);
        if (!is_array($data)) $data = [];

        try {
            return $this->json($this->zoneService->update($id, $data), 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }

    #[Route('/{zoneId}/characters/{characterId}/position', name: 'api_zone_character_position', methods: ['PATCH'])]
    public function savePosition(int $zoneId, int $characterId, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent() ?: '', true);
        if (!is_array($data)) $data = [];

        $x = $data['xPercent'] ?? null;
        $y = $data['yPercent'] ?? null;

        if (!is_numeric($x) || !is_numeric($y)) {
            return $this->json(['message' => 'xPercent/yPercent requis'], 400);
        }

        try {
            return $this->json(
                $this->zoneService->saveCharacterPosition($zoneId, $characterId, (float) $x, (float) $y),
                200
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 500);
        }
    }

    #[Route('/{zoneId}/characters/positions', name: 'api_zone_character_positions_list', methods: ['GET'])]
    public function listPositions(int $zoneId): JsonResponse
{
    $user = $this->getUser();
    if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

    try {
        return $this->json($this->zoneService->listCharacterPositions($zoneId), 200);
    } catch (\RuntimeException $e) {
        return $this->json(['message' => $e->getMessage()], 404);
    } catch (\Throwable $e) {
        return $this->json(['message' => $e->getMessage()], 500);
    }
    }
}
