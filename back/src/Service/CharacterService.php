<?php
// src/Service/CharacterService.php

namespace App\Service;

use App\Entity\Character;
use App\Entity\Location;
use App\Entity\User;
use App\Repository\CharacterAttributesRepository;
use App\Repository\CharacterKnowledgeRepository;
use App\Repository\CharacterRepository;
use App\Repository\CharacterSkillValueRepository;
use App\Repository\LocationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\String\Slugger\SluggerInterface;

class CharacterService
{
    public function __construct(
        private EntityManagerInterface $em,
        private Security $security,
        private SluggerInterface $slugger,
        private CharacterRepository $characterRepository,
        private LocationRepository $locationRepository,
        private CharacterAttributesRepository $attributesRepository,
        private CharacterSkillValueRepository $skillValueRepository,
        private CharacterKnowledgeRepository $knowledgeRepository,
        private string $projectDir, // injecte %kernel.project_dir%
    ) {}

    public function getCharacterCardsForCurrentUser(?int $locationId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            return [];
        }

        $characters = $locationId !== null
            ? $this->characterRepository->findByLocationIdActive($locationId)
            : $this->characterRepository->findAllActive();

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

        $isAdminOrMj = $this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_MJ');

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
            $data['biography']  = $character->getBiography();
            $data['strengths']  = $character->getStrengths();
            $data['weaknesses'] = $character->getWeaknesses();
        } else {
            $knowledgeList = $this->knowledgeRepository->findBy([
                'viewer' => $user,
                'target' => $character,
            ]);

            $allowed = [];
            foreach ($knowledgeList as $k) {
                $allowed[$k->getField()] = true;
            }

            if (isset($allowed['biography']))  $data['biography']  = $character->getBiography();
            if (isset($allowed['strengths']))  $data['strengths']  = $character->getStrengths();
            if (isset($allowed['weaknesses'])) $data['weaknesses'] = $character->getWeaknesses();
        }

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

        if (method_exists($character, 'getLocation') && $character->getLocation()) {
            $data['location'] = [
                'id' => $character->getLocation()->getId(),
                'name' => $character->getLocation()->getName(),
            ];
        } else {
            $data['location'] = null;
        }

        return $data;
    }

    public function createFromRequest(Request $request): Character
    {
        $character = new Character();

        $this->applyRequestToCharacter($request, $character, true);

        $this->em->persist($character);
        $this->em->flush();

        return $character;
    }

    public function updateFromRequest(Character $character, Request $request): Character
    {
        $this->applyRequestToCharacter($request, $character, false);

        $this->em->flush();

        return $character;
    }

    private function applyRequestToCharacter(Request $request, Character $character, bool $isCreate): void
    {
        $nickname = trim((string) $request->request->get('nickname', ''));
        if ($isCreate && $nickname === '') {
            throw new \InvalidArgumentException('nickname est obligatoire');
        }
        if ($nickname !== '') {
            $character->setNickname($nickname);
        }

        $firstname = $request->request->get('firstname', null);
        if ($firstname !== null) {
            $character->setFirstname(trim((string) $firstname));
        }

        $lastname = $request->request->get('lastname', null);
        if ($lastname !== null) {
            $character->setLastname(trim((string) $lastname));
        }

        $ageRaw = $request->request->get('age', null);
        if ($ageRaw !== null) {
            $character->setAge(is_numeric($ageRaw) ? (int) $ageRaw : 0);
        }

        $bio = $request->request->get('biography', null);
        if ($bio !== null) {
            $character->setBiography((string) $bio);
        }

        $strengths = $request->request->get('strengths', null);
        if ($strengths !== null) {
            $character->setStrengths((string) $strengths);
        }

        $weaknesses = $request->request->get('weaknesses', null);
        if ($weaknesses !== null) {
            $character->setWeaknesses((string) $weaknesses);
        }

        $clan = $request->request->get('clan', null);
        if ($clan !== null) {
            $clan = trim((string) $clan);
            $character->setClan($clan === '' ? null : $clan);
        }

        $isPlayerRaw = $request->request->get('isPlayer', null);
        if ($isPlayerRaw !== null) {
            $val = strtolower(trim((string) $isPlayerRaw));
            $character->setIsPlayer($val === '1' || $val === 'true' || $val === 'on');
        }

        $locationIdRaw = $request->request->get('locationId', null);
        if (method_exists($character, 'setLocation')) {
            if ($locationIdRaw === null || $locationIdRaw === '') {
                $character->setLocation(null);
            } elseif (is_numeric($locationIdRaw)) {
                /** @var Location|null $loc */
                $loc = $this->locationRepository->find((int) $locationIdRaw);
                if ($loc) {
                    $character->setLocation($loc);
                }
            }
        }

        $avatar = $request->files->get('avatar');
        if ($avatar instanceof UploadedFile) {
            if (!$avatar->isValid()) {
                throw new \InvalidArgumentException('Upload avatar invalide');
            }

            $original = pathinfo($avatar->getClientOriginalName(), PATHINFO_FILENAME);
            $safeName = $this->slugger->slug($original)->lower();
            $ext = $avatar->guessExtension() ?: 'bin';
            $newFilename = $safeName . '-' . uniqid('', true) . '.' . $ext;

            $targetDir = rtrim($this->projectDir, '/\\') . '/public/uploads/avatars';
            if (!is_dir($targetDir)) {
                @mkdir($targetDir, 0775, true);
            }

            try {
                $avatar->move($targetDir, $newFilename);
            } catch (FileException $e) {
                throw new \RuntimeException('Erreur upload avatar');
            }

            $character->setAvatarUrl('/uploads/avatars/' . $newFilename);
        }
    }
}
