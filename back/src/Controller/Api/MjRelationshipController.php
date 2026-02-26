<?php
// src/Controller/Api/MjRelationshipController.php

namespace App\Controller\Api;

use App\Service\RelationshipService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api/mj')]
final class MjRelationshipController extends AbstractController
{
    public function __construct(
        private RelationshipService $relationshipService
    ) {}

    private function getCampaignId(Request $request): int
    {
        return (int) $request->query->get('campaignId');
    }

    private function badRequest(string $message): JsonResponse
    {
        return $this->json(['message' => $message], 400);
    }

    private function forbidden(string $message): JsonResponse
    {
        return $this->json(['message' => $message], 403);
    }

    private function notFound(string $message): JsonResponse
    {
        return $this->json(['message' => $message], 404);
    }

    #[Route('/characters/{id}/known', name: 'api_mj_character_known', methods: ['GET'])]
    public function known(int $id, Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }

        try {
            $items = $this->relationshipService->getKnownMiniCardsForCharacter($campaignId, $id);
            return $this->json($items, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->notFound($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            // On évite de tout renvoyer en 403 (ça masque les bugs)
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/characters/{id}/candidates', name: 'api_mj_character_candidates', methods: ['GET'])]
    public function candidates(int $id, Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }

        try {
            $items = $this->relationshipService->getCandidatesFor($campaignId, $id);
            return $this->json($items, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->notFound($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/characters/{id}/known', name: 'api_mj_character_add_known', methods: ['POST'])]
    public function addKnown(int $id, Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }

        $data = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($data)) {
            return $this->badRequest('JSON invalide');
        }

        $toCharacterId = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
        $type = isset($data['type']) ? (string) $data['type'] : null;

        if ($toCharacterId <= 0) {
            return $this->badRequest('toCharacterId manquant');
        }

        try {
            $out = $this->relationshipService->addKnown($campaignId, $id, $toCharacterId, $type);
            return $this->json($out, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->badRequest($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/characters/{fromId}/known/{toId}', name: 'api_mj_character_remove_known', methods: ['DELETE'])]
    public function removeKnown(int $fromId, int $toId, Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }
        try {
            $this->relationshipService->removeKnown($campaignId, $fromId, $toId);
            return $this->json(['ok' => true], 200);
        } catch (\InvalidArgumentException $e) {
            return $this->badRequest($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/relationships', name: 'api_mj_relationship_upsert', methods: ['PATCH'])]
    public function upsert(Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }

        $data = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($data)) {
            return $this->badRequest('JSON invalide');
        }

        $fromId = isset($data['fromCharacterId']) ? (int) $data['fromCharacterId'] : 0;
        $toId   = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
        $stars  = isset($data['relationshipStars']) ? (int) $data['relationshipStars'] : -1;

        if ($fromId <= 0 || $toId <= 0 || $stars < 0) {
            return $this->badRequest('Paramètres manquants');
        }

        try {
            $out = $this->relationshipService->upsertRelationshipStars($campaignId, $fromId, $toId, $stars);
            return $this->json($out, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->badRequest($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }
}
