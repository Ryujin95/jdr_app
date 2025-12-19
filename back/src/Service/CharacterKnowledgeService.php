<?php

namespace App\Service;

use App\Entity\Character;
use App\Entity\CharacterKnowledge;
use App\Entity\User;
use App\Repository\CharacterKnowledgeRepository;
use Doctrine\ORM\EntityManagerInterface;

class CharacterKnowledgeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private CharacterKnowledgeRepository $knowledgeRepository,
    ) {
    }

    /**
     * Donne ou met à jour la connaissance d'un joueur sur un champ précis d'un personnage.
     *
     * Exemple de $field :
     *  - 'biography'
     *  - 'strengths'
     *  - 'weaknesses'
     *  - 'relationships'
     *  - 'secret:1' (plus tard si tu veux lier un secret)
     *
     * Exemple de $knowledgeLevel :
     *  - 'full'
     *  - 'partial'
     *  - 'hint'
     */
    public function grantFieldKnowledge(
        User $viewer,
        Character $target,
        string $field,
        string $knowledgeLevel = 'full',
        ?string $notes = null
    ): CharacterKnowledge {
        $knowledge = $this->knowledgeRepository->findOneBy([
            'viewer' => $viewer,
            'target' => $target,
            'field'  => $field,
        ]);

        if (!$knowledge) {
            $knowledge = new CharacterKnowledge();
            $knowledge->setViewer($viewer);
            $knowledge->setTarget($target);
            $knowledge->setField($field);
            $this->em->persist($knowledge);
        }

        $knowledge->setKnowledgeLevel($knowledgeLevel);
        $knowledge->setNotes($notes);

        $this->em->flush();

        return $knowledge;
    }

    /**
     * Retire une connaissance (le joueur "oublie" ou on lui retire l'accès).
     */
    public function revokeFieldKnowledge(User $viewer, Character $target, string $field): void
    {
        $knowledge = $this->knowledgeRepository->findOneBy([
            'viewer' => $viewer,
            'target' => $target,
            'field'  => $field,
        ]);

        if ($knowledge) {
            $this->em->remove($knowledge);
            $this->em->flush();
        }
    }
}
