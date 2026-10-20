<?php
// src/Controller/UserController.php

namespace App\Controller;

use App\Service\UserService;
use App\Entity\User;
use App\Security\UserAccessPolicy;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException as SecurityAccessDeniedException;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users', name: 'api_users_')]
final class UserController extends AbstractController
{
    public function __construct(
        private UserService $service,
        private UserAccessPolicy $accessPolicy,
        private LoggerInterface $logger,
    ) {}

    #[Route('', methods: ['GET'])]
    public function list(): JsonResponse
    {
        try {
            $this->denyAccessUnlessGranted('ROLE_ADMIN');
            return $this->json($this->service->list());
        } catch (AccessDeniedHttpException $e) {
            return $this->json(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return $this->json(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'users.list');
        }
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        try {
            return $this->json($this->service->create($request->toArray()), 201);
        } catch (JsonException $e) {
            return $this->json(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (ConflictHttpException $e) {
            return $this->json(['message' => $e->getMessage(), 'code' => 'conflict'], 409);
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'users.create');
            return $this->json(['message' => $e->getMessage(), 'code' => $this->codeForStatus($e->getStatusCode())], $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e, 'users.create');
        }
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        try {
            $actor = $this->getUser();
            if (!$actor instanceof User || !$this->accessPolicy->canView($actor, $id, $this->isGranted('ROLE_ADMIN'))) {
                throw new AccessDeniedHttpException();
            }
            return $this->json($this->service->show($id));
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'users.show');
            return $this->json(['message' => $e->getMessage(), 'code' => $this->codeForStatus($e->getStatusCode())], $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e, 'users.show');
        }
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        try {
            $actor = $this->getUser();
            if (!$actor instanceof User || !$this->accessPolicy->canUpdate($actor, $id, $this->isGranted('ROLE_ADMIN'))) {
                throw new AccessDeniedHttpException();
            }

            // Non-admins always update the authenticated entity. Admins may target
            // another account after the explicit policy check above.
            $target = $this->isGranted('ROLE_ADMIN') ? $this->service->findUser($id) : $actor;

            return $this->json($this->service->update($target, $request->toArray()));
        } catch (JsonException $e) {
            return $this->json(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (ConflictHttpException $e) {
            return $this->json(['message' => $e->getMessage(), 'code' => 'conflict'], 409);
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'users.update');
            return $this->json(['message' => $e->getMessage(), 'code' => $this->codeForStatus($e->getStatusCode())], $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e, 'users.update');
        }
    }

    private function codeForStatus(int $status): string
    {
        return match ($status) {
            400, 422 => 'validation_error',
            401 => 'unauthorized',
            403 => 'forbidden',
            404 => 'not_found',
            409 => 'conflict',
            default => 'request_error',
        };
    }

    private function serverError(\Throwable $exception, string $operation): JsonResponse
    {
        $errorId = bin2hex(random_bytes(8));
        $this->logger->error('Unexpected user API failure.', [
            'operation' => $operation,
            'error_id' => $errorId,
            'exception_class' => $exception::class,
            'exception_file' => $exception->getFile(),
            'exception_line' => $exception->getLine(),
        ]);

        return $this->json([
            'message' => 'Erreur serveur.',
            'code' => 'server_error',
            'errorId' => $errorId,
        ], 500);
    }
}
