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
    ) {}

    public function getCharacterCardsForCurrentUser(?int $locationId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        if (!$user) {
            return [];
        }

        if ($locationId !== null) {
            $characters = $this->characterRepository->findByLocationIdActive($locationId);
        } else {
            $characters = $this->characterRepository->findAllActive();
        }

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
                'clan'      => $character->getClan(),
            ];
        }

        return $cards;
    }

    public function getCharacterDetailForCurrentUser(Character $character): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();

        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        $isAdminOrMj = $this->security->isGranted('ROLE_ADMIN')
            || $this->security->isGranted('ROLE_MJ');

        $data = [
            'id'        => $character->getId(),
            'nickname'  => $character->getNickname(),
            'firstname' => $character->getFirstname(),
            'lastname'  => $character->getLastname(),
            'age'       => $character->getAge(),
            'avatarUrl' => $character->getAvatarUrl(),
            'isPlayer'  => $character->isPlayer(),
            'clan'      => $character->getClan(),
        ];

        if ($isAdminOrMj) {
            $data['biography'] = $character->getBiography();
            $data['strengths'] = $character->getStrengths();
            $data['weaknesses'] = $character->getWeaknesses();
        } else {
            $knowledgeList = $this->knowledgeRepository->findBy([
                'viewer' => $user,
                'target' => $character,
            ]);

            $allowedFields = [];
            foreach ($knowledgeList as $knowledge) {
                $allowedFields[$knowledge->getField()] = $knowledge->getKnowledgeLevel();
            }

            if (isset($allowedFields['biography'])) {
                $data['biography'] = $character->getBiography();
            }

            if (isset($allowedFields['strengths'])) {
                $data['strengths'] = $character->getStrengths();
            }

            if (isset($allowedFields['weaknesses'])) {
                $data['weaknesses'] = $character->getWeaknesses();
            }
        }

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
