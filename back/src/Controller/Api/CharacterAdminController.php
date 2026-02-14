<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\Character\CharacterRepository;
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
        private UserRepository $userRepository,
    ) {}

    // ✅ MODIF: méthode unique pour garder le même style que /me et /campaigns
    private function assertAdminOrMj(): void
    {
        // ✅ MODIF: même logique de sécurité, mais centralisée
        if (!$this->isGranted('ROLE_ADMIN') && !$this->isGranted('ROLE_MJ')) {
            throw new AccessDeniedException('Permission denied');
        }
    }

    #[Route('/characters', name: 'api_admin_characters_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $this->assertAdminOrMj(); // ✅ MODIF

        try {
            $character = $this->characterService->createFromRequest($request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);

            return $this->json($view, 201); // ✅ MODIF: style homogène
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400); // ✅ MODIF
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Server error'], 500); // ✅ MODIF: on évite de leak l’erreur
        }
    }

    #[Route('/characters/{id}', name: 'api_admin_characters_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->assertAdminOrMj(); // ✅ MODIF

        $character = $this->characterRepository->find($id);
        if (!$character) {
            return $this->json(['message' => 'Character not found'], 404); // ✅ MODIF
        }

        try {
            $character = $this->characterService->updateFromRequest($character, $request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);

            return $this->json($view, 200); // ✅ MODIF
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400); // ✅ MODIF
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Server error'], 500); // ✅ MODIF
        }
    }

    // Body JSON attendu: { "userId": 12 } ou { "userId": null }
    #[Route('/characters/{id}/owner', name: 'api_admin_characters_assign_owner', methods: ['PATCH'])]
    public function assignOwner(int $id, Request $request): JsonResponse
    {
        $this->assertAdminOrMj(); // ✅ MODIF

        $character = $this->characterRepository->find($id);
        if (!$character) {
            return $this->json(['message' => 'Character not found'], 404); // ✅ MODIF
        }

        $data = json_decode($request->getContent() ?: '', true) ?? [];
        $userIdRaw = $data['userId'] ?? null;

        // ✅ MODIF: validation claire comme /me et /campaigns
        $userId = null;
        if ($userIdRaw !== null && $userIdRaw !== '') {
            if (!is_numeric($userIdRaw)) {
                return $this->json(['message' => 'userId invalide'], 400); // ✅ MODIF
            }
            $userId = (int) $userIdRaw;
        }

        try {
            $result = $this->characterService->assignOwner($character, $userId);

            return $this->json($result, 200); // ✅ MODIF
        } catch (\InvalidArgumentException $e) {
            // ✅ MODIF: user/character introuvable -> 404 (comme campaign show)
            return $this->json(['message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Server error'], 500); // ✅ MODIF
        }
    }

    // ✅ Liste des users pour le select front
    #[Route('/users', name: 'api_admin_users_index', methods: ['GET'])]
    public function users(): JsonResponse
    {
        $this->assertAdminOrMj(); // ✅ MODIF

        $users = $this->userRepository->findAll();

        $out = [];
        foreach ($users as $u) {
            // ✅ MODIF: on sécurise le type (comme /me)
            if (!$u instanceof User) continue;

            $out[] = [
                'id' => $u->getId(),
                'username' => method_exists($u, 'getUsername') ? $u->getUsername() : null,
                'email' => method_exists($u, 'getEmail') ? $u->getEmail() : null,
                'roles' => $u->getRoles(), // ✅ MODIF: utile côté front (filtrage)
            ];
        }

        return $this->json($out, 200); // ✅ MODIF
    }
}
