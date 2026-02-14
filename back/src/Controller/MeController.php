<?php
// src/Controller/MeController.php

namespace App\Controller;

use App\Entity\User;
use App\Repository\Campaign\CampaignRepository;
use App\Service\MeService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class MeController extends AbstractController
{
    public function __construct(
        private MeService $meService,
        private CampaignRepository $campaignRepository
    ) {}

    #[Route('/me', name: 'api_me_get', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

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
            'disableTransitions' => method_exists($user, 'isDisableTransitions')
                ? (bool) $user->isDisableTransitions()
                : false,
            'campaignRoles' => $campaignRoles,
        ], 200);
    }

    #[Route('/me', name: 'api_me_update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent() ?: '', true) ?? [];
        $user = $this->meService->update($user, $data);

        $rows = $this->campaignRepository->findForUser($user);

        $campaignRoles = [];
        foreach ($rows as $r) {
            if (isset($r['id'], $r['role'])) {
                $campaignRoles[(string) $r['id']] = (string) $r['role'];
            }
        }

        return $this->json([
            'message' => 'Profil mis à jour',
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'disableTransitions' => method_exists($user, 'isDisableTransitions')
                ? (bool) $user->isDisableTransitions()
                : false,
            'campaignRoles' => $campaignRoles,
        ], 200);
    }

    #[Route('/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function delete(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $this->meService->delete($user);

        return new JsonResponse(null, 204);
    }
}
