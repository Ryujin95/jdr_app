<?php
// src/Controller/Api/MjRelationshipController.php

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
    public function known(int $id): JsonResponse
    {
        try {
            $items = $this->relationshipService->getKnownMiniCardsForCharacter($id);
            return new JsonResponse($items, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Server error'], 500);
        }
    }

    #[Route('/characters/{id}/candidates', name: 'api_mj_character_candidates', methods: ['GET'])]
    public function candidates(int $id): JsonResponse
    {
        try {
            $items = $this->relationshipService->getCandidatesFor($id);
            return new JsonResponse($items, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Server error'], 500);
        }
    }

   #[Route('/characters/{id}/known', name: 'api_mj_character_add_known', methods: ['POST'])]
public function addKnown(int $id, Request $request): JsonResponse
{
    try {
        $data = json_decode($request->getContent(), true) ?? [];
        $toId = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
        $type = isset($data['type']) ? (string) $data['type'] : null;

        $out = $this->relationshipService->addKnown($id, $toId, $type);
        return new JsonResponse($out, 201);
    } catch (\InvalidArgumentException $e) {
        return new JsonResponse(['message' => $e->getMessage()], 400);
    } catch (\Throwable $e) {
        return new JsonResponse(['message' => 'Server error'], 500);
    }
}


    #[Route('/relationships', name: 'api_mj_relationship_upsert', methods: ['PATCH'])]
    public function upsert(Request $request): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true) ?? [];

            $fromId = isset($data['fromCharacterId']) ? (int) $data['fromCharacterId'] : 0;
            $toId = isset($data['toCharacterId']) ? (int) $data['toCharacterId'] : 0;
            $stars = isset($data['stars']) ? (int) $data['stars'] : -1;

            $result = $this->relationshipService->upsertRelationshipStars($fromId, $toId, $stars);
            return new JsonResponse($result, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Server error'], 500);
        }
    }
}
