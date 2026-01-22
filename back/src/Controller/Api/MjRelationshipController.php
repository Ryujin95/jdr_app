<?php
// src/Controller/Api/MjRelationshipController.php
// (Nom libre, mais les routes doivent matcher ton debug:router)

namespace App\Controller\Api;

use App\Service\RelationshipService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/mj')]
final class MjRelationshipController extends AbstractController
{
    public function __construct(
        private RelationshipService $relationshipService
    ) {}

    #[Route('/characters/{id}/known', name: 'api_mj_character_known', methods: ['GET'])]
    public function known(int $id, Request $request): JsonResponse
    {
        $campaignId = (int) $request->query->get('campaignId');
        if ($campaignId <= 0) {
            return $this->json(['message' => 'campaignId manquant'], 400);
        }

        try {
            $items = $this->relationshipService->getKnownMiniCardsForCharacter($campaignId, $id);
            return $this->json($items, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        }
    }

    #[Route('/characters/{id}/candidates', name: 'api_mj_character_candidates', methods: ['GET'])]
    public function candidates(int $id, Request $request): JsonResponse
    {
        $campaignId = (int) $request->query->get('campaignId');
        if ($campaignId <= 0) {
            return $this->json(['message' => 'campaignId manquant'], 400);
        }

        try {
            $items = $this->relationshipService->getCandidatesFor($campaignId, $id);
            return $this->json($items, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        }
    }

    #[Route('/characters/{id}/known', name: 'api_mj_character_add_known', methods: ['POST'])]
    public function addKnown(int $id, Request $request): JsonResponse
    {
        $campaignId = (int) $request->query->get('campaignId');
        if ($campaignId <= 0) {
            return $this->json(['message' => 'campaignId manquant'], 400);
        }

        $data = json_decode($request->getContent() ?: '[]', true);
        $toCharacterId = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
        $type = isset($data['type']) ? (string) $data['type'] : null;

        if ($toCharacterId <= 0) {
            return $this->json(['message' => 'toCharacterId manquant'], 400);
        }

        try {
            $out = $this->relationshipService->addKnown($campaignId, $id, $toCharacterId, $type);
            return $this->json($out, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        }
    }

    #[Route('/characters/{fromId}/known/{toId}', name: 'api_mj_character_remove_known', methods: ['DELETE'])]
    public function removeKnown(int $fromId, int $toId, Request $request): JsonResponse
    {
        $campaignId = (int) $request->query->get('campaignId');
        if ($campaignId <= 0) {
            return $this->json(['message' => 'campaignId manquant'], 400);
        }

        try {
            $this->relationshipService->removeKnown($campaignId, $fromId, $toId);
            return $this->json(['ok' => true], 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        }
    }

    #[Route('/relationships', name: 'api_mj_relationship_upsert', methods: ['PATCH'])]
    public function upsert(Request $request): JsonResponse
    {
        $campaignId = (int) $request->query->get('campaignId');
        if ($campaignId <= 0) {
            return $this->json(['message' => 'campaignId manquant'], 400);
        }

        $data = json_decode($request->getContent() ?: '[]', true);

        $fromId = isset($data['fromCharacterId']) ? (int) $data['fromCharacterId'] : 0;
        $toId   = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
        $stars  = isset($data['relationshipStars']) ? (int) $data['relationshipStars'] : -1;

        if ($fromId <= 0 || $toId <= 0 || $stars < 0) {
            return $this->json(['message' => 'Paramètres manquants'], 400);
        }

        try {
            $out = $this->relationshipService->upsertRelationshipStars($campaignId, $fromId, $toId, $stars);
            return $this->json($out, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        }
    }
}
