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
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class MeController extends AbstractController
{
    public function __construct(
        private MeService $meService,
        private CampaignRepository $campaignRepository,
        private EntityManagerInterface $em
    ) {}

    #[Route('/me', name: 'api_me_get', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

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
            'disableTransitions' => method_exists($user, 'isDisableTransitions')
                ? (bool) $user->isDisableTransitions()
                : false,
            'profileCampaignVisibility' => method_exists($user, 'getProfileCampaignVisibility')
                ? (string) $user->getProfileCampaignVisibility()
                : 'COMMON_ONLY',
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

        if (array_key_exists('profileCampaignVisibility', $data) && method_exists($user, 'setProfileCampaignVisibility')) {
            try {
                $user->setProfileCampaignVisibility((string) $data['profileCampaignVisibility']);
            } catch (\InvalidArgumentException $e) {
                return $this->json(['message' => 'Invalid profileCampaignVisibility'], 422);
            }
            $this->em->flush();
        }

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
            'profileCampaignVisibility' => method_exists($user, 'getProfileCampaignVisibility')
                ? (string) $user->getProfileCampaignVisibility()
                : 'COMMON_ONLY',
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
