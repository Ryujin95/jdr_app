<?php
// back/src/Controller/Api/CampaignController.php

namespace App\Controller\Api;

use App\Service\CampaignService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class CampaignController extends AbstractController
{
    public function __construct(private CampaignService $campaignService) {}

    #[Route('/campaigns', name: 'api_campaign_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        return $this->json($this->campaignService->listForUser($user));
    }

    #[Route('/campaigns', name: 'api_campaign_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $title = trim((string)($data['title'] ?? ''));
        $theme = isset($data['theme']) ? trim((string)$data['theme']) : null;

        if ($title === '') {
            return $this->json(['message' => 'Titre requis'], 400);
        }

        $campaign = $this->campaignService->createCampaign($user, $title, $theme);

        return $this->json([
            'id' => $campaign->getId(),
            'title' => $campaign->getTitle(),
            'theme' => $campaign->getTheme(),
        ], 201);
    }
}
