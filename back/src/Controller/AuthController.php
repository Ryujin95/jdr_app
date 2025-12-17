<?php

// src/Controller/AuthController.php

namespace App\Controller;

use App\Service\ResetPasswordTokenService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class AuthController
{
    public function __construct(
        private ResetPasswordTokenService $resetPasswordService
    ) {}

    #[Route('/auth/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = strtolower(trim($data['email'] ?? ''));

        if ($email === '') {
            return new JsonResponse(['message' => 'Email requis'], 400);
        }

        // C’EST CETTE LIGNE QUI MANQUAIT
        $this->resetPasswordService->requestReset($email);

        // Toujours la même réponse pour éviter l’info leak
        return new JsonResponse([
            'message' => 'Si l’email existe, un lien de réinitialisation a été envoyé.'
        ]);
    }
}
