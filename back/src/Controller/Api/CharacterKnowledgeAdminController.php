<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Repository\UserRepository;
use App\Service\CharacterKnowledgeService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/knowledge')]
#[IsGranted('ROLE_MJ')]
class CharacterKnowledgeAdminController extends AbstractController
{
    public function __construct(
        private CharacterKnowledgeService $knowledgeService,
        private UserRepository $userRepository,
        private CharacterRepository $characterRepository,
    ) {
    }

    #[Route('/grant', name: 'api_admin_knowledge_grant', methods: ['POST'])]
    public function grant(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $viewerId    = $data['viewerId']    ?? null;
        $characterId = $data['characterId'] ?? null;
        $field       = $data['field']       ?? null;
        $level       = $data['knowledgeLevel'] ?? 'full';
        $notes       = $data['notes']          ?? null;

        if (!$viewerId || !$characterId || !$field) {
            return new JsonResponse(['message' => 'viewerId, characterId et field sont requis'], 400);
        }

        $viewer = $this->userRepository->find($viewerId);
        if (!$viewer) {
            return new JsonResponse(['message' => 'Viewer not found'], 404);
        }

        $character = $this->characterRepository->find($characterId);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $knowledge = $this->knowledgeService->grantFieldKnowledge(
            $viewer,
            $character,
            $field,
            $level,
            $notes
        );

        return new JsonResponse([
            'id'            => $knowledge->getId(),
            'viewerId'      => $viewer->getId(),
            'characterId'   => $character->getId(),
            'field'         => $knowledge->getField(),
            'knowledgeLevel'=> $knowledge->getKnowledgeLevel(),
            'notes'         => $knowledge->getNotes(),
        ], 200);
    }

    #[Route('/revoke', name: 'api_admin_knowledge_revoke', methods: ['POST'])]
    public function revoke(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $viewerId    = $data['viewerId']    ?? null;
        $characterId = $data['characterId'] ?? null;
        $field       = $data['field']       ?? null;

        if (!$viewerId || !$characterId || !$field) {
            return new JsonResponse(['message' => 'viewerId, characterId et field sont requis'], 400);
        }

        $viewer = $this->userRepository->find($viewerId);
        if (!$viewer) {
            return new JsonResponse(['message' => 'Viewer not found'], 404);
        }

        $character = $this->characterRepository->find($characterId);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $this->knowledgeService->revokeFieldKnowledge($viewer, $character, $field);

        return new JsonResponse(['message' => 'Knowledge revoked'], 200);
    }
}
