<?php

namespace App\Controller;

use App\Service\ResetPasswordTokenService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Routing\Attribute\Route;

class ResetPasswordTokenController
{
    public function __construct(private ResetPasswordTokenService $service, private LoggerInterface $logger) {}

    #[Route('/api/auth/reset-password-info', name: 'api_reset_password_info', methods: ['GET'])]
    public function info(Request $request): JsonResponse
    {
        $token = (string) $request->query->get('token', '');

        try {
            $data = $this->service->getResetInfo($token);
            return new JsonResponse($data, 200);
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'password_reset.info');
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'request_error'], $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e, 'password_reset.info');
        } catch (\Throwable $e) {
            return $this->serverError($e, 'password_reset.info');
        }
    }

    #[Route('/api/auth/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function reset(Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
            $token = $data['token'] ?? null;
            $password = $data['password'] ?? null;
            if (!is_string($token) || !is_string($password)) {
                return new JsonResponse(['message' => 'Token et mot de passe requis.', 'code' => 'validation_error'], 400);
            }

            $this->service->resetPassword($token, $password);
            return new JsonResponse(['message' => 'Mot de passe mis à jour', 'code' => 'success'], 200);
        } catch (JsonException $e) {
            return new JsonResponse(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (HttpExceptionInterface $e) {
            if ($e->getStatusCode() >= 500) return $this->serverError($e, 'password_reset.reset');
            return new JsonResponse([
                'message' => $e->getMessage(),
                'code' => match ($e->getStatusCode()) {
                    400 => 'invalid_request',
                    404 => 'not_found',
                    409 => 'conflict',
                    422 => 'validation_error',
                    default => 'request_error',
                },
            ], $e->getStatusCode());
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => 'Token invalide ou expiré.', 'code' => 'not_found'], 404);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'password_reset.reset');
        }
    }

    private function serverError(\Throwable $exception, string $operation): JsonResponse
    {
        $errorId = bin2hex(random_bytes(8));
        $this->logger->error('Unexpected password reset API failure.', [
            'operation' => $operation,
            'error_id' => $errorId,
            'exception_class' => $exception::class,
            'exception_file' => $exception->getFile(),
            'exception_line' => $exception->getLine(),
        ]);

        return new JsonResponse(['message' => 'Erreur serveur.', 'code' => 'server_error', 'errorId' => $errorId], 500);
    }
}
