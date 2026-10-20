<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\UserRepository;
use App\Service\CampaignAuthorization;
use App\Service\CharacterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

#[Route('/api/admin')]
class CharacterAdminController extends AbstractController
{
    public function __construct(
        private CharacterService $characterService,
        private CharacterRepository $characterRepository,
        private UserRepository $userRepository,
        private CampaignMemberRepository $campaignMemberRepository,
        private CampaignAuthorization $campaignAuthorization,
    ) {}

    private function assertAdminOrCampaignMj(int $campaignId): void
    {
        $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
    }

    private function authorizationError(\Closure $check): ?JsonResponse
    {
        try {
            $check();
            return null;
        } catch (AccessDeniedHttpException $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return $this->json(['message' => $e->getMessage()], 404);
        }
    }

    #[Route('/characters', name: 'api_admin_characters_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $campaignId = $this->requestCampaignId($request);
        if ($campaignId === null || $campaignId <= 0) {
            return $this->json(['message' => 'campaignId requis'], 400);
        }

        $error = $this->authorizationError(fn() => $this->assertAdminOrCampaignMj($campaignId));
        if ($error) return $error;

        try {
            $character = $this->characterService->createFromRequest($request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);

            return $this->json($view, 201);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (AccessDeniedHttpException $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        } catch (\Throwable) {
            return $this->json(['message' => 'Server error'], 500);
        }
    }

    #[Route('/characters/{id}', name: 'api_admin_characters_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $character = $this->characterRepository->find($id);
        if (!$character) {
            return $this->json(['message' => 'Character not found'], 404);
        }

        $error = $this->authorizationError(fn() => $this->campaignAuthorization->assertResourceRole($character, ['MJ']));
        if ($error) return $error;

        try {
            $character = $this->characterService->updateFromRequest($character, $request);
            $view = $this->characterService->getCharacterDetailForCurrentUser($character);

            return $this->json($view, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (AccessDeniedHttpException $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        } catch (\Throwable) {
            return $this->json(['message' => 'Server error'], 500);
        }
    }

    #[Route('/campaigns/{campaignId}/available-players', name: 'api_admin_campaign_available_players', methods: ['GET'])]
    public function availablePlayers(int $campaignId): JsonResponse
    {
        $error = $this->authorizationError(fn() => $this->assertAdminOrCampaignMj($campaignId));
        if ($error) return $error;

        try {
            $rows = $this->campaignMemberRepository->findAvailablePlayersWithoutCharacter($campaignId);

            $out = [];
            foreach ($rows as $r) {
                $out[] = [
                    'id' => (int) ($r['id'] ?? 0),
                    'username' => $r['username'] ?? null,
                    'email' => $r['email'] ?? null,
                ];
            }

            return $this->json($out, 200);
        } catch (\Throwable) {
            return $this->json(['message' => 'Server error'], 500);
        }
    }

    #[Route('/characters/{id}/owner', name: 'api_admin_characters_assign_owner', methods: ['PATCH'])]
    public function assignOwner(int $id, Request $request): JsonResponse
    {
        $character = $this->characterRepository->find($id);
        if (!$character) {
            return $this->json(['message' => 'Character not found'], 404);
        }
        $error = $this->authorizationError(fn() => $this->campaignAuthorization->assertResourceRole($character, ['MJ']));
        if ($error) return $error;

        $data = json_decode($request->getContent() ?: '', true) ?? [];
        $userIdRaw = $data['userId'] ?? null;

        $userId = null;
        if ($userIdRaw !== null && $userIdRaw !== '') {
            if (!is_numeric($userIdRaw)) {
                return $this->json(['message' => 'userId invalide'], 400);
            }
            $userId = (int) $userIdRaw;
        }

        try {
            $result = $this->characterService->assignOwner($character, $userId);
            return $this->json($result, 200);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (AccessDeniedException $e) {
            return $this->json(['message' => $e->getMessage()], 403);
        } catch (\Throwable) {
            return $this->json(['message' => 'Server error'], 500);
        }
    }

    #[Route('/users', name: 'api_admin_users_index', methods: ['GET'])]
    public function users(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $users = $this->userRepository->findAll();

        $out = [];
        foreach ($users as $u) {
            if (!$u instanceof User) continue;

            $out[] = [
                'id' => $u->getId(),
                'username' => method_exists($u, 'getUsername') ? $u->getUsername() : null,
            ];
        }

        return $this->json($out, 200);
    }

#[Route('/characters/{id}', name: 'api_admin_characters_show', methods: ['GET'])]
public function show(int $id, Request $request): JsonResponse
{
    $character = $this->characterRepository->find($id);
    if (!$character) {
        return $this->json(['message' => 'Character not found'], 404);
    }

    $error = $this->authorizationError(fn() => $this->campaignAuthorization->assertResourceRole($character, ['MJ']));
    if ($error) return $error;

    $campaignId = $request->query->get('campaignId');
    $campaignId = is_numeric($campaignId) ? (int) $campaignId : null;

    $data = $this->characterService->getCharacterDetailForCurrentUser($character, $campaignId);

    return $this->json($data, 200);
}

    private function requestCampaignId(Request $request): ?int
    {
        $raw = $request->request->get('campaignId', $request->request->get('campaign_id'));
        if ($raw === null) {
            $raw = $request->query->get('campaignId');
        }
        if ($raw === null && str_contains((string) $request->headers->get('Content-Type'), 'application/json')) {
            $payload = json_decode($request->getContent() ?: '', true);
            $raw = is_array($payload) ? ($payload['campaignId'] ?? $payload['campaign_id'] ?? null) : null;
        }

        return is_numeric($raw) ? (int) $raw : null;
    }
}
