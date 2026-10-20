<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\TrashService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TrashController extends AbstractController
{
    public function __construct(private TrashService $trashService) {}

    #[Route('/api/trash', name: 'api_trash_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        return $this->respond(function () use ($request): JsonResponse {
            return new JsonResponse($this->trashService->getTrash(
                $this->authenticatedUser(),
                $this->campaignId($request),
            ));
        });
    }

    #[Route('/api/trash/restore/{entity}/{id}', name: 'api_trash_restore', methods: ['PATCH'])]
    public function restore(string $entity, int $id, Request $request): JsonResponse
    {
        return $this->respond(function () use ($entity, $id, $request): JsonResponse {
            $this->trashService->restore($entity, $id, $this->campaignId($request), $this->authenticatedUser());
            return new JsonResponse(['message' => 'Restored successfully']);
        });
    }

    #[Route('/api/trash/force/{entity}/{id}', name: 'api_trash_force_delete', methods: ['DELETE'])]
    public function forceDelete(string $entity, int $id, Request $request): JsonResponse
    {
        return $this->respond(function () use ($entity, $id, $request): JsonResponse {
            $this->trashService->forceDelete($entity, $id, $this->campaignId($request), $this->authenticatedUser());
            return new JsonResponse(['message' => 'Permanently deleted']);
        });
    }

    #[Route('/api/trash/move/{entity}/{id}', name: 'api_trash_move', methods: ['PATCH'])]
    public function moveToTrash(string $entity, int $id, Request $request): JsonResponse
    {
        return $this->respond(function () use ($entity, $id, $request): JsonResponse {
            $payload = json_decode($request->getContent(), true);
            if (!is_array($payload)) {
                throw new \InvalidArgumentException('Corps JSON invalide.');
            }

            $campaignId = array_key_exists('campaignId', $payload)
                ? $this->positiveInteger($payload['campaignId'], 'campaignId')
                : null;
            $this->trashService->moveToTrash($entity, $id, $campaignId, $this->authenticatedUser());

            return new JsonResponse(['message' => 'Moved to trash']);
        });
    }

    private function authenticatedUser(): User
    {
        if (!$this->isGranted('IS_AUTHENTICATED_FULLY')) {
            throw new AccessDeniedHttpException('Authentification requise.');
        }
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedHttpException('Authentification requise.');
        }

        return $user;
    }

    private function campaignId(Request $request): ?int
    {
        if (!$request->query->has('campaignId')) {
            return null;
        }

        return $this->positiveInteger($request->query->all()['campaignId'] ?? null, 'campaignId');
    }

    private function positiveInteger(mixed $value, string $field): int
    {
        if (!is_int($value) && !is_string($value)) {
            throw new \InvalidArgumentException(sprintf('%s invalide.', $field));
        }

        $validated = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($validated === false) {
            throw new \InvalidArgumentException(sprintf('%s invalide.', $field));
        }

        return $validated;
    }

    private function respond(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (\InvalidArgumentException $exception) {
            return new JsonResponse(['message' => $exception->getMessage()], 400);
        } catch (AccessDeniedHttpException $exception) {
            return new JsonResponse(['message' => $exception->getMessage()], 403);
        } catch (NotFoundHttpException $exception) {
            return new JsonResponse(['message' => $exception->getMessage()], 404);
        } catch (ConflictHttpException $exception) {
            return new JsonResponse(['message' => $exception->getMessage()], 409);
        } catch (\Throwable) {
            return new JsonResponse(['message' => 'Internal error'], 500);
        }
    }
}
