<?php

namespace App\Controller;

use App\Service\ResetPasswordTokenService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class ResetPasswordTokenController
{
    public function __construct(private ResetPasswordTokenService $service) {}

    #[Route('/api/auth/reset-password-info', name: 'api_reset_password_info', methods: ['GET'])]
    public function info(Request $request): JsonResponse
    {
        $token = (string) $request->query->get('token', '');

        try {
            $data = $this->service->getResetInfo($token);
            return new JsonResponse($data, 200);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }
    }

    #[Route('/api/auth/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function reset(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $token = trim((string)($data['token'] ?? ''));
        $password = (string)($data['password'] ?? '');

        try {
            $this->service->resetPassword($token, $password);
            return new JsonResponse(['message' => 'Mot de passe mis à jour'], 200);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        }
    }
}
