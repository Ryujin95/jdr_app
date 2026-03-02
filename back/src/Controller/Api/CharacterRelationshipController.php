<?php
// src/Controller/Api/CharacterRelationshipController.php

namespace App\Controller\Api;

use App\Service\RelationshipService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api')]
final class CharacterRelationshipController extends AbstractController
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

    #[Route('/characters/{id}/known', name: 'api_character_known_viewer', methods: ['GET'])]
    public function knownForViewer(int $id, Request $request): JsonResponse
    {
        $campaignId = $this->getCampaignId($request);
        if ($campaignId <= 0) {
            return $this->badRequest('campaignId manquant');
        }

        try {
            // IMPORTANT: ce controller appelle une méthode "viewer"
            // (joueur: uniquement son perso, MJ/admin: ok)
            $items = $this->relationshipService->getKnownMiniCardsForViewer($campaignId, $id);
            return $this->json($items, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->notFound($e->getMessage());
        } catch (AccessDeniedException $e) {
            return $this->forbidden($e->getMessage());
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Erreur serveur'], 500);
        }
    }
}
