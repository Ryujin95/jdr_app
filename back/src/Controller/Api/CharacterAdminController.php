<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Service\CharacterViewService;
use App\Service\CharacterWriteService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin')]
class CharacterAdminController extends AbstractController
{
    public function __construct(
        private CharacterWriteService $characterWriteService,
        private CharacterViewService $characterViewService,
        private CharacterRepository $characterRepository,
    ) {
    }

    #[Route('/characters', name: 'api_admin_characters_create', methods: ['POST'])]
    #[IsGranted('ROLE_MJ')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $character = $this->characterWriteService->saveFromPayload(null, $data);

        $view = $this->characterViewService->getCharacterDetailForCurrentUser($character);

        return new JsonResponse($view, 201);
    }

    #[Route('/characters/{id}', name: 'api_admin_characters_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_MJ')]
    public function update(int $id, Request $request): JsonResponse
    {
        $character = $this->characterRepository->find($id);

        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $character = $this->characterWriteService->saveFromPayload($character, $data);

        $view = $this->characterViewService->getCharacterDetailForCurrentUser($character);

        return new JsonResponse($view, 200);
    }
}
