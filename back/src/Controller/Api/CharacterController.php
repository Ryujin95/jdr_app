<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Service\CharacterViewService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

#[Route('/api')]
class CharacterController extends AbstractController
{
    public function __construct(
        private CharacterViewService $characterViewService,
        private CharacterRepository $characterRepository,
    ) {
    }

    #[Route('/characters', name: 'api_characters_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $cards = $this->characterViewService->getCharacterCardsForCurrentUser();

        return new JsonResponse($cards, 200);
    }

    #[Route('/characters/{id}', name: 'api_characters_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $character = $this->characterRepository->find($id);

        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $data = $this->characterViewService->getCharacterDetailForCurrentUser($character);

        return new JsonResponse($data, 200);
    }

    #[Route('/locations/{locationId}/characters', name: 'api_characters_by_location', methods: ['GET'])]
    public function charactersByLocation(int $locationId): JsonResponse
    {
        // on délègue tout au service, qui sait déjà filtrer par locationId
        $cards = $this->characterViewService->getCharacterCardsForCurrentUser($locationId);

        return new JsonResponse($cards, 200);
    }

    #[Route('/characters/{id}/trash', name: 'api_characters_trash', methods: ['PATCH'])]
    public function trash(int $id, EntityManagerInterface $em): JsonResponse
    {
        // sécurité MJ / Admin uniquement pour supprimer un perso
        if (
            !$this->isGranted('ROLE_ADMIN') &&
            !$this->isGranted('ROLE_MJ')
        ) {
            throw new AccessDeniedException('Permission denied');
        }

        $character = $this->characterRepository->find($id);

        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        if (method_exists($character, 'isDeleted') && $character->isDeleted()) {
            return new JsonResponse(['message' => 'Already deleted'], 400);
        }

        if (method_exists($character, 'setDeleted')) {
            $character->setDeleted(true);
        }

        $em->flush();

        return new JsonResponse(['message' => 'Character moved to trash'], 200);
    }
}
