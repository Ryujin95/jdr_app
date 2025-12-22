<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Service\CharacterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api/admin')]
class CharacterAdminController extends AbstractController
{
    public function __construct(
        private CharacterService $characterService,
        private CharacterRepository $characterRepository,
    ) {}

    #[Route('/characters', name: 'api_admin_characters_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }

        try {
            $character = $this->characterService->createFromRequest($request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);
            return new JsonResponse($view, 201);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => $e->getMessage()], 500);
        }
    }

    #[Route('/characters/{id}', name: 'api_admin_characters_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }

        $character = $this->characterRepository->find($id);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        try {
            $character = $this->characterService->updateFromRequest($character, $request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);
            return new JsonResponse($view, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => $e->getMessage()], 500);
        }
    }
}
