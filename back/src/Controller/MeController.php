<?php
// src/Controller/MeController.php

namespace App\Controller;

use App\Entity\User;
use App\Repository\Campaign\CampaignRepository;
use App\Service\MeService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Psr\Log\LoggerInterface;

#[Route('/api')]
class MeController extends AbstractController
{
    public function __construct(
        private MeService $meService,
        private CampaignRepository $campaignRepository,
        private EntityManagerInterface $em,
        private LoggerInterface $logger,
    ) {
    }

    #[Route('/me', name: 'api_me_get', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized', 'code' => 'unauthorized'], 401);
        }

        try {
            $this->meService->touchPresence($user);
            $rows = $this->campaignRepository->findForUser($user);

            $campaignRoles = [];
            foreach ($rows as $r) {
                if (isset($r['id'], $r['role'])) {
                    $campaignRoles[(string) $r['id']] = (string) $r['role'];
                }
            }

            return $this->json([
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'disableTransitions' => $user->isDisableTransitions(),
                'profileCampaignVisibility' => $user->getProfileCampaignVisibility(),
                'avatarUrl' => $user->getAvatarUrl(),
                'campaignRoles' => $campaignRoles,
            ], 200);
        } catch (\Throwable $exception) {
            return $this->serverError($exception, 'me.show');
        }
    }

    #[Route('/me', name: 'api_me_update', methods: ['PUT', 'POST'])]
    public function update(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $user = $this->meService->updateFromRequest($user, $request);

            $rows = $this->campaignRepository->findForUser($user);

            $campaignRoles = [];
            foreach ($rows as $r) {
                if (isset($r['id'], $r['role'])) {
                    $campaignRoles[(string) $r['id']] = (string) $r['role'];
                }
            }

            return $this->json([
                'message' => 'Profil mis à jour',
                'reauthenticate' => $this->meService->requiresReauthentication(),
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'email' => $user->getEmail(),
                'roles' => $user->getRoles(),
                'disableTransitions' => method_exists($user, 'isDisableTransitions')
                    ? (bool) $user->isDisableTransitions()
                    : false,
                'profileCampaignVisibility' => method_exists($user, 'getProfileCampaignVisibility')
                    ? (string) $user->getProfileCampaignVisibility()
                    : 'COMMON_ONLY',
                'avatarUrl' => method_exists($user, 'getAvatarUrl')
                    ? $user->getAvatarUrl()
                    : null,
                'campaignRoles' => $campaignRoles,
            ], 200);
        } catch (ConflictHttpException $e) {
            return $this->json(['message' => $e->getMessage(), 'code' => 'conflict'], 409);
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'me.update');
            return $this->json([
                'message' => $e->getMessage(),
                'code' => match ($e->getStatusCode()) {
                    400 => 'invalid_request',
                    401 => 'unauthorized',
                    403 => 'forbidden',
                    404 => 'not_found',
                    409 => 'conflict',
                    422 => 'validation_error',
                    default => 'request_error',
                },
            ], $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e, 'me.update');
        }
    }

    #[Route('/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $this->meService->delete($user);
        } catch (ConflictHttpException $exception) {
            return $this->json(['message' => $exception->getMessage(), 'code' => 'conflict'], 409);
        } catch (\Throwable $exception) {
            return $this->serverError($exception, 'me.delete');
        }

        return new JsonResponse(null, 204);
    }

    private function serverError(\Throwable $exception, string $operation): JsonResponse
    {
        $errorId = bin2hex(random_bytes(8));
        $this->logger->error('Unexpected account API failure.', [
            'operation' => $operation,
            'error_id' => $errorId,
            'exception_class' => $exception::class,
            'exception_file' => $exception->getFile(),
            'exception_line' => $exception->getLine(),
        ]);

        return $this->json(['message' => 'Erreur serveur.', 'code' => 'server_error', 'errorId' => $errorId], 500);
    }
}
