<?php

namespace App\Service;

use App\Entity\Character;
use App\Entity\CharacterAttributes;
use App\Entity\CharacterSkillValue;
use App\Repository\CharacterAttributesRepository;
use App\Repository\CharacterSkillValueRepository;
use App\Repository\SkillRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class CharacterWriteService
{
    public function __construct(
        private EntityManagerInterface $em,
        private CharacterAttributesRepository $attributesRepository,
        private CharacterSkillValueRepository $skillValueRepository,
        private SkillRepository $skillRepository,
        private UserRepository $userRepository,
    ) {
    }

    /**
     * Crée ou met à jour un personnage à partir d'une payload JSON.
     *
     * @param Character|null $character  null = création, sinon mise à jour
     * @param array          $data       données décodées depuis le JSON
     */
    public function saveFromPayload(?Character $character, array $data): Character
    {
        if (!$character) {
            $character = new Character();
            $this->em->persist($character);
        }

        // ---- owner (propriétaire du personnage) ----
        // Si on reçoit un ownerId, on essaie de lier le perso à ce User.
        if (array_key_exists('ownerId', $data)) {
            $ownerId = $data['ownerId'];

            if ($ownerId !== null && $ownerId !== '') {
                $owner = $this->userRepository->find((int) $ownerId);
                if ($owner) {
                    $character->setOwner($owner);
                }
                // Si l'id ne correspond à aucun user, on ne change rien.
            } else {
                // Si ownerId est null ou vide, on peut détacher le perso de tout owner.
                $character->setOwner(null);
            }
        }

        // ---- identité / narratif ----
        $character
            ->setFirstname($data['firstname'] ?? $character->getFirstname() ?? '')
            ->setLastname($data['lastname'] ?? $character->getLastname() ?? '')
            ->setNickname($data['nickname'] ?? $character->getNickname() ?? '')
            ->setAge(isset($data['age']) ? (int) $data['age'] : ($character->getAge() ?? 0))
            ->setBiography($data['biography'] ?? $character->getBiography() ?? '')
            ->setStrengths($data['strengths'] ?? $character->getStrengths())
            ->setWeaknesses($data['weaknesses'] ?? $character->getWeaknesses())
            ->setAvatarUrl($data['avatarUrl'] ?? $character->getAvatarUrl())
            ->setIsPlayer(isset($data['isPlayer']) ? (bool) $data['isPlayer'] : ($character->isPlayer() ?? false))
            ->setClan($data['clan'] ?? $character->getClan()); // nouveau: clan

        $isPlayer = $character->isPlayer() === true;

        // ---- attributs (joueurs uniquement) ----
        if ($isPlayer && isset($data['attributes']) && is_array($data['attributes'])) {
            $attributes = $this->attributesRepository->findOneBy(['character' => $character]);

            if (!$attributes) {
                $attributes = new CharacterAttributes();
                $attributes->setCharacter($character);
                $this->em->persist($attributes);
            }

            $attrData = $data['attributes'];

            $attributes
                ->setStrength((int) ($attrData['strength'] ?? $attributes->getStrength() ?? 0))
                ->setAgility((int) ($attrData['agility'] ?? $attributes->getAgility() ?? 0))
                ->setWits((int) ($attrData['wits'] ?? $attributes->getWits() ?? 0))
                ->setEmpathy((int) ($attrData['empathy'] ?? $attributes->getEmpathy() ?? 0));
        }

        // ---- skills (joueurs uniquement) ----
        if ($isPlayer && isset($data['skills']) && is_array($data['skills'])) {
            foreach ($data['skills'] as $item) {
                if (!isset($item['skillId'], $item['level'])) {
                    continue;
                }

                $skillId = (int) $item['skillId'];
                $level   = (int) $item['level'];

                $skill = $this->skillRepository->find($skillId);
                if (!$skill) {
                    continue;
                }

                $skillValue = $this->skillValueRepository->findOneBy([
                    'owner' => $character,
                    'skill' => $skill,
                ]);

                if (!$skillValue) {
                    $skillValue = new CharacterSkillValue();
                    $skillValue->setOwner($character);
                    $skillValue->setSkill($skill);
                    $this->em->persist($skillValue);
                }

                $skillValue->setLevel($level);
            }
        }

        $this->em->flush();

        return $character;
    }
}
