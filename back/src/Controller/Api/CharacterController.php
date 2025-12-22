<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Service\CharacterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class CharacterController extends AbstractController
{
    public function __construct(
        private CharacterService $characterService,
        private CharacterRepository $characterRepository,
    ) {}

    #[Route('/characters', name: 'api_characters_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $cards = $this->characterService->getCharacterCardsForCurrentUser();
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

    #[Route('/locations/{locationId}/characters', name: 'api_characters_by_location', methods: ['GET'])]
    public function charactersByLocation(int $locationId): JsonResponse
    {
        $cards = $this->characterService->getCharacterCardsForCurrentUser($locationId);
        return new JsonResponse($cards, 200);
    }
}
