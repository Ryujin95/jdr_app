<?php

namespace App\Controller\Api;

use App\Service\TrashService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class TrashController extends AbstractController
{
    public function __construct(
        private TrashService $trashService
    ) {}

    #[Route('/api/trash', name: 'api_trash_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = $this->trashService->getTrash();
        return new JsonResponse($data, 200);
    }

    #[Route('/api/trash/restore/{entity}/{id}', name: 'api_trash_restore', methods: ['PATCH'])]
    public function restore(string $entity, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $this->trashService->restore($entity, $id);
        return new JsonResponse(['message' => 'Restored successfully'], 200);
    }

    #[Route('/api/trash/force/{entity}/{id}', name: 'api_trash_force_delete', methods: ['DELETE'])]
    public function forceDelete(string $entity, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $this->trashService->forceDelete($entity, $id);
        return new JsonResponse(['message' => 'Permanently deleted'], 200);
    }

    #[Route('/api/trash/move/{entity}/{id}', name: 'api_trash_move', methods: ['PATCH'])]
    public function moveToTrash(string $entity, int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $user = $this->getUser();
        if (!$user) {
            throw new AccessDeniedException('Permission denied');
        }

        $payload = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($payload)) $payload = [];

        $campaignId = 0;
        if (isset($payload['campaignId']) && is_numeric($payload['campaignId'])) {
            $campaignId = (int) $payload['campaignId'];
        }

        try {
            // ✅ campaignId devient optionnel : 0 = “déduis toi-même”
            $this->trashService->moveToTrash($entity, $id, $campaignId, $user);
            return new JsonResponse(['message' => 'Moved to trash'], 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Internal error'], 500);
        }
    }
}
