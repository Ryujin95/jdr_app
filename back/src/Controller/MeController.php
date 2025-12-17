<?php
// src/Controller/MeController.php

namespace App\Controller;

use App\Entity\User;
use App\Service\MeService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class MeController extends AbstractController
{
    #[Route('/me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Non authentifié'], 401);
        }

        return new JsonResponse([
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
        ]);
    }

    #[Route('/me', methods: ['PUT'])]
    public function update(Request $request, MeService $service): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Non authentifié'], 401);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $user = $service->update($user, $data);

        return new JsonResponse([
            'message' => 'Profil mis à jour',
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
        ]);
    }
}
