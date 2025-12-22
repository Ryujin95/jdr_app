<?php

namespace App\Controller\Api;

use App\Service\TrashService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
        $data = $this->trashService->getTrash();
        return new JsonResponse($data, 200);
    }

    #[Route('/api/trash/restore/{entity}/{id}', name: 'api_trash_restore', methods: ['PATCH'])]
    public function restore(string $entity, int $id): JsonResponse
    {
        $this->trashService->restore($entity, $id);
        return new JsonResponse(['message' => 'Restored successfully'], 200);
    }

    #[Route('/api/trash/force/{entity}/{id}', name: 'api_trash_force_delete', methods: ['DELETE'])]
    public function forceDelete(string $entity, int $id): JsonResponse
    {
        $this->trashService->forceDelete($entity, $id);
        return new JsonResponse(['message' => 'Permanently deleted'], 200);
    }

    // ✅ AJOUTE ÇA
    #[Route('/api/trash/move/{entity}/{id}', name: 'api_trash_move', methods: ['PATCH'])]
    public function moveToTrash(string $entity, int $id): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }

        $this->trashService->moveToTrash($entity, $id);

        return new JsonResponse(['message' => 'Moved to trash'], 200);
    }
}
