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
    public function __construct(private MeService $meService)
    {
    }

    #[Route('/me', name: 'api_me_get', methods: ['GET'])]
public function me(): JsonResponse
{
    $user = $this->getUser();
    if (!$user instanceof User) {
        return $this->json(['error' => 'Non authentifié'], 401);
    }

    return $this->json([
        'id'       => $user->getId(),
        'username' => $user->getUsername(),
        'email'    => $user->getEmail(),

        // ✅ AJOUTE ÇA
        'roles'    => $user->getRoles(),

        // ✅ ton truc reste pareil
        'disableTransitions' => method_exists($user, 'isDisableTransitions')
            ? $user->isDisableTransitions()
            : false,
    ]);
}


    #[Route('/me', name: 'api_me_update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], 401);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $user = $this->meService->update($user, $data);

        return $this->json([
            'message'  => 'Profil mis à jour',
            'username' => $user->getUsername(),
            'email'    => $user->getEmail(),
            // ✅ NOUVEAU
            'disableTransitions' => method_exists($user, 'isDisableTransitions')
                ? $user->isDisableTransitions()
                : false,
        ]);
    }

    #[Route('/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Non authentifié'], 401);
        }

        $this->meService->delete($user);

        return new JsonResponse(null, 204);
    }
}
