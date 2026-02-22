<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class UserSearchController extends AbstractController
{
    public function __construct(private UserRepository $userRepo) {}

    #[Route('/api/users/search', name: 'api_users_search', methods: ['GET'])]
    public function search(): JsonResponse
    {
        $me = $this->getUser();
        if (!$me instanceof User) {
            return $this->json(['message' => 'Unauthorized'], 401);
        }

        $q = trim((string) ($_GET['q'] ?? ''));
        if ($q === '' || mb_strlen($q) < 2) {
            return $this->json([], 200);
        }

        // Recherche simple sur username (et email si tu veux)
        $rows = $this->userRepo->createQueryBuilder('u')
            ->select('u.id AS id, u.username AS username')
            ->andWhere('u.id != :meId')
            ->andWhere('LOWER(u.username) LIKE :q')
            ->setParameter('meId', $me->getId())
            ->setParameter('q', '%' . mb_strtolower($q) . '%')
            ->setMaxResults(10)
            ->orderBy('u.username', 'ASC')
            ->getQuery()
            ->getArrayResult();

        return $this->json($rows, 200);
    }
}
