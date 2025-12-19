<?php

namespace App\Service;

use App\Entity\Character;
use App\Entity\User;
use App\Repository\CharacterAttributesRepository;
use App\Repository\CharacterKnowledgeRepository;
use App\Repository\CharacterRepository;
use App\Repository\CharacterSkillValueRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class CharacterViewService
{
    public function __construct(
        private CharacterRepository $characterRepository,
        private CharacterAttributesRepository $attributesRepository,
        private CharacterSkillValueRepository $skillValueRepository,
        private CharacterKnowledgeRepository $knowledgeRepository,
        private Security $security,
    ) {
    }

    /**
     * Liste de personnages sous forme de "cards".
     * Pour l'instant : tout le monde connecté voit tous les personnages.
     * (On affinera plus tard avec CharacterKnowledge si tu veux.)
     */
    public function getCharacterCardsForCurrentUser(): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        if (!$user) {
            return [];
        }

        $characters = $this->characterRepository->findAll();

        $cards = [];

        foreach ($characters as $character) {
            $cards[] = [
                'id'        => $character->getId(),
                'nickname'  => $character->getNickname(),
                'firstname' => $character->getFirstname(),
                'lastname'  => $character->getLastname(),
                'age'       => $character->getAge(),
                'avatarUrl' => $character->getAvatarUrl(),
                'isPlayer'  => $character->isPlayer(),
            ];
        }

        return $cards;
    }

    /**
     * Détail d’un personnage adapté à l'utilisateur connecté
     * en fonction de CharacterKnowledge + rôle (MJ/Admin).
     */
    public function getCharacterDetailForCurrentUser(Character $character): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        $isAdminOrMj = $this->security->isGranted('ROLE_ADMIN')
            || $this->security->isGranted('ROLE_MJ');

        // Base : identité toujours visible pour celui qui a accès à la fiche
        $data = [
            'id'        => $character->getId(),
            'nickname'  => $character->getNickname(),
            'firstname' => $character->getFirstname(),
            'lastname'  => $character->getLastname(),
            'age'       => $character->getAge(),
            'avatarUrl' => $character->getAvatarUrl(),
            'isPlayer'  => $character->isPlayer(),
        ];

        // MJ / Admin : voient tout le narratif d’office
        if ($isAdminOrMj) {
            $data['biography'] = $character->getBiography();
            $data['strengths'] = $character->getStrengths();
            $data['weaknesses'] = $character->getWeaknesses();
        } else {
            // Joueur normal : on regarde CharacterKnowledge
            $knowledgeList = $this->knowledgeRepository->findBy([
                'viewer' => $user,
                'target' => $character,
            ]);

            $allowedFields = [];
            foreach ($knowledgeList as $knowledge) {
                // key = field (ex: 'biography', 'strengths', 'weaknesses', 'relationships', 'secret:1', etc.)
                $allowedFields[$knowledge->getField()] = $knowledge->getKnowledgeLevel();
            }

            // Bio visible seulement si le MJ l’a validée
            if (isset($allowedFields['biography'])) {
                $data['biography'] = $character->getBiography();
            }

            // Qualités visibles seulement si validées
            if (isset($allowedFields['strengths'])) {
                $data['strengths'] = $character->getStrengths();
            }

            // Défauts visibles seulement si validés
            if (isset($allowedFields['weaknesses'])) {
                $data['weaknesses'] = $character->getWeaknesses();
            }

            // Plus tard, on pourra gérer aussi ici:
            // - relationships
            // - secret:X
            // selon ce qu'on aura mis dans CharacterKnowledge.
        }

        // 🔒 Gameplay (attributs + skills)
        // Pour l'instant : MJ / Admin seulement.
        // Quand on aura ajouté un owner sur Character, on ajoutera le cas "propriétaire".
        if ($isAdminOrMj) {
            $attributes = $this->attributesRepository->findOneBy(['character' => $character]);

            if ($attributes) {
                $data['attributes'] = [
                    'strength' => $attributes->getStrength(),
                    'agility'  => $attributes->getAgility(),
                    'wits'     => $attributes->getWits(),
                    'empathy'  => $attributes->getEmpathy(),
                ];
            }

            $skillValues = $this->skillValueRepository->findBy(['owner' => $character]);

            $skills = [];
            foreach ($skillValues as $sv) {
                $skill = $sv->getSkill();
                $skills[] = [
                    'id'              => $skill->getId(),
                    'name'            => $skill->getName(),
                    'parentAttribute' => $skill->getParentAttribute(),
                    'level'           => $sv->getLevel(),
                ];
            }

            $data['skills'] = $skills;
        }

        return $data;
    }
}
