<?php

namespace App\Controller\Api;

use App\Service\SkillService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
class SkillController extends AbstractController
{
    public function __construct(
        private SkillService $skillService,
    ) {
    }

    #[Route('/skills', name: 'api_skills_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $skills = $this->skillService->getAllSkills();

        return new JsonResponse($skills, 200);
    }
}
