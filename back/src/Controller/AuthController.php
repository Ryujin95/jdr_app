<?php

// src/Controller/AuthController.php

namespace App\Controller;

use App\Service\ResetPasswordTokenService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\Attribute\Route;

class AuthController
{
    public function __construct(
        private ResetPasswordTokenService $resetPasswordService,
        private LoggerInterface $logger,
    ) {}

    #[Route('/auth/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
            if (!is_string($data['email'] ?? null) || trim($data['email']) === '') {
                return new JsonResponse(['message' => 'Email requis.', 'code' => 'validation_error'], 400);
            }

            $this->resetPasswordService->requestReset($data['email']);
        } catch (JsonException $exception) {
            return new JsonResponse(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (HttpExceptionInterface $exception) {
            if ($exception->getStatusCode() >= 500) {
                $errorId = bin2hex(random_bytes(8));
                $this->logger->error('Unexpected forgot password API failure.', [
                    'operation' => 'password_reset.request',
                    'error_id' => $errorId,
                    'exception_class' => $exception::class,
                    'exception_file' => $exception->getFile(),
                    'exception_line' => $exception->getLine(),
                ]);
                return new JsonResponse(['message' => 'Erreur serveur.', 'code' => 'server_error', 'errorId' => $errorId], 500);
            }
            return new JsonResponse([
                'message' => $exception->getMessage(),
                'code' => $exception->getStatusCode() === 422 ? 'validation_error' : 'request_error',
            ], $exception->getStatusCode());
        } catch (\Throwable $exception) {
            $errorId = bin2hex(random_bytes(8));
            $this->logger->error('Unexpected forgot password API failure.', [
                'operation' => 'password_reset.request',
                'error_id' => $errorId,
                'exception_class' => $exception::class,
                'exception_file' => $exception->getFile(),
                'exception_line' => $exception->getLine(),
            ]);

            return new JsonResponse(['message' => 'Erreur serveur.', 'code' => 'server_error', 'errorId' => $errorId], 500);
        }

        // Toujours la même réponse pour éviter l’info leak
        return new JsonResponse([
            'message' => 'Si l’email existe, un lien de réinitialisation a été envoyé.'
        ]);
    }
}
