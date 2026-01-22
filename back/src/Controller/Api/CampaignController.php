<?php
// back/src/Controller/Api/CampaignController.php

namespace App\Controller\Api;

use App\Entity\User; // ✅ AJOUT
use App\Service\CampaignService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class CampaignController extends AbstractController
{
    public function __construct(private CampaignService $campaignService) {}

    #[Route('/api/campaigns', name: 'api_campaign_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        return $this->json($this->campaignService->listForUser($user));
    }

    #[Route('/api/campaigns', name: 'api_campaign_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent(), true) ?? [];
        $title = trim((string)($data['title'] ?? ''));
        $theme = isset($data['theme']) ? trim((string)$data['theme']) : null;

        if ($title === '') return $this->json(['message' => 'Titre requis'], 400);

        $campaign = $this->campaignService->createCampaign($user, $title, $theme);

        return $this->json([
            'id' => $campaign->getId(),
            'title' => $campaign->getTitle(),
            'theme' => $campaign->getTheme(),
            'joinCode' => method_exists($campaign, 'getJoinCode') ? $campaign->getJoinCode() : null,
            'role' => 'MJ', // ✅ AJOUT (créateur = MJ)
            'updatedAt' => $campaign->getUpdatedAt()->format(\DateTimeInterface::ATOM), // ✅ AJOUT (cohérence)
        ], 201);
    }

    #[Route('/api/campaigns/join', name: 'api_campaign_join', methods: ['POST'])]
    public function join(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) return $this->json(['message' => 'Unauthorized'], 401);

        $data = json_decode($request->getContent(), true) ?? [];
        $code = (string)($data['code'] ?? '');

        try {
            $campaign = $this->campaignService->joinByCode($user, $code);

            return $this->json([
                'id' => $campaign->getId(),
                'title' => $campaign->getTitle(),
                'theme' => $campaign->getTheme(),
                'joinCode' => method_exists($campaign, 'getJoinCode') ? $campaign->getJoinCode() : null,
                'role' => 'Player', // ✅ AJOUT (join = Player)
                'updatedAt' => $campaign->getUpdatedAt()->format(\DateTimeInterface::ATOM), // ✅ AJOUT
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        }
    }

   // back/src/Controller/Api/CampaignController.php

#[Route('/api/campaigns/{id}', name: 'api_campaign_show', methods: ['GET'])]
public function show(int $id): JsonResponse
{
    $user = $this->getUser();
    if (!$user) {
        return $this->json(['message' => 'Unauthorized'], 401);
    }

    try {
        // ✅ MODIF: renvoie aussi "role" (MJ/Player) pour éviter le décalage côté front
        $data = $this->campaignService->getForUserData($user, $id);

        return $this->json($data, 200);
    } catch (\RuntimeException $e) {
        return $this->json(['message' => $e->getMessage()], 404);
    } catch (\InvalidArgumentException $e) {
        return $this->json(['message' => $e->getMessage()], 403);
    }
}

}
