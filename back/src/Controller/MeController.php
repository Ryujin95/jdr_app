<?php
// src/Controller/MeController.php

namespace App\Controller;

use App\Entity\User;
use App\Repository\CampaignRepository;
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
        private CampaignRepository $campaignRepository, // ✅ MODIF: on injecte pour récupérer les rôles de campagnes
    ) {}

    #[Route('/me', name: 'api_me_get', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        // ✅ MODIF: on renvoie aussi les rôles par campagne pour supprimer le décalage de l’onglet Éditeur
        // Le front pourra faire: user.campaignRoles[id] === "MJ"
        $rows = $this->campaignRepository->findForUser($user);

        $campaignRoles = [];
        foreach ($rows as $r) {
            if (isset($r['id'], $r['role'])) {
                $campaignRoles[(string) $r['id']] = (string) $r['role']; // ex: "MJ" ou "Player"
            }
        }

        return $this->json([
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),

            // IMPORTANT: ton front s’appuie dessus (ROLE_ADMIN, etc.)
            'roles' => $user->getRoles(),

            // préférence (dans ton User entity tu as: isDisableTransitions())
            'disableTransitions' => method_exists($user, 'isDisableTransitions')
                ? (bool) $user->isDisableTransitions()
                : false,

            // ✅ MODIF: clé pour afficher l’onglet Éditeur instant (sans attendre CampaignPage)
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

        $data = json_decode($request->getContent(), true) ?? [];
        $user = $this->meService->update($user, $data);

        // ✅ MODIF: on renvoie aussi campaignRoles après update (pour garder le front cohérent)
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

            // ✅ MODIF
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
