<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Service\CharacterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class CharacterController extends AbstractController
{
    public function __construct(
        private CharacterService $characterService,
        private CharacterRepository $characterRepository,
    ) {}

    #[Route('/characters', name: 'api_characters_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $locationId = $request->query->get('locationId');
        $locationId = is_numeric($locationId) ? (int) $locationId : null;

        $cards = $this->characterService->getCharacterCardsForCurrentUser($locationId);

        return new JsonResponse($cards, 200);
    }

    #[Route('/characters/{id}', name: 'api_characters_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $character = $this->characterRepository->find($id);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $data = $this->characterService->getCharacterDetailForCurrentUser($character);

        return new JsonResponse($data, 200);
    }

    #[Route('/characters', name: 'api_characters_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        try {
            $character = $this->characterService->createFromRequest($request);

            $data = $this->characterService->getCharacterDetailForCurrentUser($character);

            return new JsonResponse($data, 201);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Server error'], 500);
        }
    }

    #[Route('/characters/{id}', name: 'api_characters_update', methods: ['POST', 'PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $character = $this->characterRepository->find($id);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        try {
            $character = $this->characterService->updateFromRequest($character, $request);

            $data = $this->characterService->getCharacterDetailForCurrentUser($character);

            return new JsonResponse($data, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => 'Server error'], 500);
        }
    }

    #[Route('/locations/{locationId}/characters', name: 'api_characters_by_location', methods: ['GET'])]
    public function charactersByLocation(int $locationId): JsonResponse
    {
        $cards = $this->characterService->getCharacterCardsForCurrentUser($locationId);

        return new JsonResponse($cards, 200);
    }
}
