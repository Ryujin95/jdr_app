<?php

namespace App\Service;

use App\Repository\SkillRepository;

class SkillService
{
    public function __construct(
        private SkillRepository $skillRepository,
    ) {
    }

    /**
     * Retourne toutes les compétences sous une forme simple
     * pour le front (id, name, parentAttribute).
     */
    public function getAllSkills(): array
    {
        $skills = $this->skillRepository->findAll();

        $data = [];

        foreach ($skills as $skill) {
            $data[] = [
                'id'              => $skill->getId(),
                'name'            => $skill->getName(),
                'parentAttribute' => $skill->getParentAttribute(),
            ];
        }

        return $data;
    }
}
