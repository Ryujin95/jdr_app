<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\FriendshipService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class FriendshipController extends AbstractController
{
    public function __construct(private FriendshipService $friendService) {}

    #[Route('/api/friends', name: 'api_friends_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        return $this->json($this->friendService->listFriends($user), 200);
    }

    #[Route('/api/friends/requests', name: 'api_friends_requests', methods: ['GET'])]
    public function requests(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        return $this->json($this->friendService->listRequests($user), 200);
    }

    #[Route('/api/friends/request', name: 'api_friends_request', methods: ['POST'])]
    public function request(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $otherUserId = (int)($data['userId'] ?? 0);
        if ($otherUserId <= 0) {
            return $this->json(['message' => 'userId requis'], 400);
        }

        $f = $this->friendService->request($user, $otherUserId);

        return $this->json([
            'friendshipId' => $f->getId(),
            'status' => $f->getStatus(),
        ], 201);
    }

    #[Route('/api/friends/{id}/accept', name: 'api_friends_accept', methods: ['POST'])]
    public function accept(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $f = $this->friendService->accept($user, $id);

        return $this->json([
            'friendshipId' => $f->getId(),
            'status' => $f->getStatus(),
        ], 200);
    }

    #[Route('/api/friends/{id}/decline', name: 'api_friends_decline', methods: ['POST'])]
    public function decline(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $this->friendService->decline($user, $id);
        return $this->json(['message' => 'Demande refusée'], 200);
    }

    #[Route('/api/friends/{otherUserId}', name: 'api_friends_remove', methods: ['DELETE'])]
    public function remove(int $otherUserId): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $this->friendService->remove($user, $otherUserId);
        return $this->json(['message' => 'Relation supprimée'], 200);
    }
}
