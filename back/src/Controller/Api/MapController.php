<?php
// back/src/Controller/Api/MapController.php

namespace App\Controller\Api;

use App\Service\MapService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/maps')]
class MapController extends AbstractController
{
    public function __construct(private MapService $mapService) {}

    #[Route('', name: 'api_maps_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        try {
            return $this->json($this->mapService->listForUser($user), 200);
        } catch (\Throwable $e) {
            $code = $e instanceof \Symfony\Component\Security\Core\Exception\AccessDeniedException ? 403 : 500;
            return $this->json(['message' => $e->getMessage()], $code);
        }
    }

    #[Route('/{id}', name: 'api_maps_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        try {
            $map = $this->mapService->get($user, $id);
            return $this->json($this->mapService->toArray($map), 200);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            $code = $e instanceof \Symfony\Component\Security\Core\Exception\AccessDeniedException ? 403 : 500;
            return $this->json(['message' => $e->getMessage()], $code);
        }
    }

    // upload multipart/form-data:
    // - name: string (obligatoire)
    // - image: file (obligatoire)
    // - zones: string JSON (optionnel)
    #[Route('', name: 'api_maps_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        try {
            $map = $this->mapService->createFromRequest($user, $request);
            return $this->json($this->mapService->toArray($map), 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $code = $e instanceof \Symfony\Component\Security\Core\Exception\AccessDeniedException ? 403 : 500;
            return $this->json(['message' => $e->getMessage()], $code);
        }
    }

    // JSON:
    // { "name": "...", "zones": [...] }
    #[Route('/{id}', name: 'api_maps_update', methods: ['PATCH', 'PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent() ?: '', true);
        if (!is_array($data)) $data = [];

        try {
            $map = $this->mapService->update($user, $id, $data);
            return $this->json($this->mapService->toArray($map), 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            $code = $e instanceof \Symfony\Component\Security\Core\Exception\AccessDeniedException ? 403 : 500;
            return $this->json(['message' => $e->getMessage()], $code);
        }
    }

    #[Route('/{id}', name: 'api_maps_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        try {
            $this->mapService->delete($user, $id);
            return $this->json(null, 204);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            $code = $e instanceof \Symfony\Component\Security\Core\Exception\AccessDeniedException ? 403 : 500;
            return $this->json(['message' => $e->getMessage()], $code);
        }
    }
}
