<?php
// src/Controller/Api/CharacterKnowledgeAdminController.php

namespace App\Controller\Api;

use App\Service\CharacterKnowledgeService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin/knowledge')]
class CharacterKnowledgeAdminController extends AbstractController
{
    public function __construct(
        private CharacterKnowledgeService $knowledgeService,
    ) {}

    #[Route('/grant', name: 'api_admin_knowledge_grant', methods: ['POST'])]
    public function grant(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($data)) return new JsonResponse(['message' => 'JSON invalide'], 400);

        $viewerId    = isset($data['viewerId']) ? (int) $data['viewerId'] : 0;
        $characterId = isset($data['characterId']) ? (int) $data['characterId'] : 0;
        $field       = isset($data['field']) ? (string) $data['field'] : '';
        $notes       = array_key_exists('notes', $data) ? ($data['notes'] !== null ? (string) $data['notes'] : null) : null;

        if ($viewerId <= 0 || $characterId <= 0 || trim($field) === '') {
            return new JsonResponse(['message' => 'viewerId, characterId et field sont requis'], 400);
        }

        try {
            $knowledge = $this->knowledgeService->grantFromIds($viewerId, $characterId, $field, $notes);

            return new JsonResponse([
                'id'          => $knowledge->getId(),
                'viewerId'    => $knowledge->getViewer()->getId(),
                'characterId' => $knowledge->getTarget()->getId(),
                'field'       => $knowledge->getField(),
                'notes'       => $knowledge->getNotes(),
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/revoke', name: 'api_admin_knowledge_revoke', methods: ['POST'])]
    public function revoke(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent() ?: '[]', true);
        if (!is_array($data)) return new JsonResponse(['message' => 'JSON invalide'], 400);

        $viewerId    = isset($data['viewerId']) ? (int) $data['viewerId'] : 0;
        $characterId = isset($data['characterId']) ? (int) $data['characterId'] : 0;
        $field       = isset($data['field']) ? (string) $data['field'] : '';

        if ($viewerId <= 0 || $characterId <= 0 || trim($field) === '') {
            return new JsonResponse(['message' => 'viewerId, characterId et field sont requis'], 400);
        }

        try {
            $this->knowledgeService->revokeFromIds($viewerId, $characterId, $field);
            return new JsonResponse(['message' => 'ok'], 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Erreur serveur'], 500);
        }
    }

    #[Route('/state', name: 'api_admin_knowledge_state', methods: ['GET'])]
    public function state(Request $request): JsonResponse
    {
        $characterId = (int) $request->query->get('characterId', 0);
        $field = (string) $request->query->get('field', '');

        if ($characterId <= 0 || trim($field) === '') {
            return new JsonResponse(['message' => 'characterId et field sont requis'], 400);
        }

        try {
            $allowedViewerIds = $this->knowledgeService->getAllowedViewerIdsForField($characterId, $field);

            return new JsonResponse([
                'characterId' => $characterId,
                'field' => trim($field),
                'allowedViewerIds' => $allowedViewerIds,
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Erreur serveur'], 500);
        }
    }
}
