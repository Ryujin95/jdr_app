<?php

namespace App\Controller\Api;

use App\Repository\CharacterRepository;
use App\Repository\UserRepository;
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
        private UserRepository $userRepository, // ✅ AJOUT
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

    // ✅ AJOUT : attribuer / retirer un utilisateur (owner) à un personnage
    // Body JSON attendu: { "userId": 12 } ou { "userId": null } pour retirer
    #[Route('/characters/{id}/owner', name: 'api_admin_characters_assign_owner', methods: ['PATCH'])]
    public function assignOwner(int $id, Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }

        $character = $this->characterRepository->find($id);
        if (!$character) {
            return new JsonResponse(['message' => 'Character not found'], 404);
        }

        $data = json_decode($request->getContent() ?: '', true) ?? [];

        $userIdRaw = $data['userId'] ?? null;

        $userId = null;
        if ($userIdRaw !== null && $userIdRaw !== '') {
            if (!is_numeric($userIdRaw)) {
                return new JsonResponse(['message' => 'userId invalide'], 400);
            }
            $userId = (int) $userIdRaw;
        }

        try {
            $result = $this->characterService->assignOwner($character, $userId);
            return new JsonResponse($result, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return new JsonResponse(['message' => $e->getMessage()], 500);
        }
    }

    // ✅ AJOUT : liste des users pour remplir le select côté front
    #[Route('/users', name: 'api_admin_users_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }

        $users = $this->userRepository->findAll();

        $out = [];
        foreach ($users as $u) {
            $out[] = [
                'id' => $u->getId(),
                'username' => method_exists($u, 'getUsername') ? $u->getUsername() : null,
                'email' => method_exists($u, 'getEmail') ? $u->getEmail() : null,
            ];
        }

        return new JsonResponse($out, 200);
    }
}
