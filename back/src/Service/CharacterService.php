<?php
// src/Service/CharacterService.php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\User;
use App\Repository\Character\CharacterAttributesRepository;
use App\Repository\Character\CharacterKnowledgeRepository;
use App\Repository\Character\CharacterRelationshipRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\Character\CharacterSkillValueRepository;
use App\Repository\LocationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
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
        private CharacterRelationshipRepository $relationshipRepository,
        private string $projectDir,
    ) {}

    public function getCharacterCardsForCurrentUser(?int $locationId = null, ?int $campaignId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            return [];
        }

        $characters = $locationId !== null
            ? $this->characterRepository->findByLocationIdActive($locationId)
            : $this->characterRepository->findAllActive();

        if ($campaignId !== null) {
            $characters = array_values(array_filter($characters, static function (Character $c) use ($campaignId) {
                $camp = method_exists($c, 'getCampaign') ? $c->getCampaign() : null;
                return $camp && $camp->getId() === $campaignId;
            }));
        }

        $myCharacter = $this->characterRepository->findActivePlayerCharacterByOwner($user);
        if ($campaignId !== null && $myCharacter) {
            $myCamp = method_exists($myCharacter, 'getCampaign') ? $myCharacter->getCampaign() : null;
            if (!$myCamp || $myCamp->getId() !== $campaignId) {
                $myCharacter = null;
            }
        }

        $affinityMap = [];
        if ($myCharacter) {
            $toIds = [];
            foreach ($characters as $c) {
                if ($c->getId() !== $myCharacter->getId()) {
                    $toIds[] = $c->getId();
                }
            }
            $affinityMap = $this->relationshipRepository->findAffinityScoresFrom($myCharacter, $toIds);
        }

        $cards = [];
        foreach ($characters as $character) {
            $ownerPayload = null;
            if ($character->isPlayer() && method_exists($character, 'getOwner') && $character->getOwner()) {
                $o = $character->getOwner();
                $ownerPayload = [
                    'id' => $o->getId(),
                    'username' => method_exists($o, 'getUsername') ? $o->getUsername() : null,
                    'email' => method_exists($o, 'getEmail') ? $o->getEmail() : null,
                ];
            }

            $affinityScore = null;
            $relationshipStars = null;

            if ($myCharacter && $myCharacter->getId() !== $character->getId()) {
                $score = (int) ($affinityMap[$character->getId()] ?? 0);
                $affinityScore = $score;
                $relationshipStars = $this->scoreToStars($score);
            }

            $cards[] = [
                'id'        => $character->getId(),
                'nickname'  => $character->getNickname(),
                'firstname' => $character->getFirstname(),
                'lastname'  => $character->getLastname(),
                'age'       => $character->getAge(),
                'avatarUrl' => $character->getAvatarUrl(),
                'transitionVideoUrl' => method_exists($character, 'getTransitionVideoUrl') ? $character->getTransitionVideoUrl() : null,
                'isPlayer'  => $character->isPlayer(),
                'clan'      => $character->getClan(),
                'owner'     => $ownerPayload,
                'affinityScore' => $affinityScore,
                'relationshipStars' => $relationshipStars,
            ];
        }

        return $cards;
    }

    private function scoreToStars(int $score): int
    {
        $score = max(0, min(100, $score));
        if ($score === 0) return 0;
        if ($score <= 20) return 1;
        if ($score <= 40) return 2;
        if ($score <= 60) return 3;
        if ($score <= 80) return 4;
        return 5;
    }

    public function getCharacterDetailForCurrentUser(Character $character, ?int $campaignId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        if ($campaignId !== null && method_exists($character, 'getCampaign')) {
            $camp = $character->getCampaign();
            if (!$camp || $camp->getId() !== $campaignId) {
                throw new AccessDeniedException('Forbidden');
            }
        }

        $data = [
            'id'        => $character->getId(),
            'nickname'  => $character->getNickname(),
            'firstname' => $character->getFirstname(),
            'lastname'  => $character->getLastname(),
            'age'       => $character->getAge(),
            'avatarUrl' => $character->getAvatarUrl(),
            'transitionVideoUrl' => method_exists($character, 'getTransitionVideoUrl')
                ? $character->getTransitionVideoUrl()
                : null,
            'isPlayer'  => $character->isPlayer(),
            'clan'      => $character->getClan(),
            'biography'  => $character->getBiography(),
            'strengths'  => $character->getStrengths(),
            'weaknesses' => $character->getWeaknesses(),
        ];

        if ($character->isPlayer() && method_exists($character, 'getOwner') && $character->getOwner()) {
            $o = $character->getOwner();
            $data['owner'] = [
                'id' => $o->getId(),
                'username' => method_exists($o, 'getUsername') ? $o->getUsername() : null,
                'email' => method_exists($o, 'getEmail') ? $o->getEmail() : null,
            ];
        } else {
            $data['owner'] = null;
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

    public function createFromRequest(Request $request, ?int $campaignId = null): Character
    {
        $character = new Character();
        $this->applyRequestToCharacter($request, $character, true, $campaignId);

        $this->em->persist($character);
        $this->em->flush();

        return $character;
    }

    public function updateFromRequest(Character $character, Request $request, ?int $campaignId = null): Character
    {
        $this->applyRequestToCharacter($request, $character, false, $campaignId);
        $this->em->flush();

        return $character;
    }

    public function assignOwner(Character $character, ?int $userId): array
    {
        if (!$this->security->isGranted('ROLE_ADMIN')) {
            throw new AccessDeniedException('Admin only');
        }

        if ($userId === null) {
            if (method_exists($character, 'setOwner')) {
                $character->setOwner(null);
            }
            $this->em->flush();

            return [
                'id' => $character->getId(),
                'owner' => null,
            ];
        }

        /** @var User|null $user */
        $user = $this->em->getRepository(User::class)->find($userId);
        if (!$user) {
            throw new \InvalidArgumentException('Utilisateur introuvable');
        }

        if (method_exists($character, 'setOwner')) {
            $character->setOwner($user);
        }
        $this->em->flush();

        return [
            'id' => $character->getId(),
            'owner' => [
                'id' => $user->getId(),
                'username' => method_exists($user, 'getUsername') ? $user->getUsername() : null,
                'email' => method_exists($user, 'getEmail') ? $user->getEmail() : null,
            ],
        ];
    }

    private function setterAllowsNull(object $obj, string $method): bool
    {
        if (!method_exists($obj, $method)) return false;

        try {
            $rm = new \ReflectionMethod($obj, $method);
            $params = $rm->getParameters();
            if (count($params) < 1) return false;
            return $params[0]->allowsNull();
        } catch (\Throwable) {
            return false;
        }
    }

    private function applyRequestToCharacter(Request $request, Character $character, bool $isCreate, ?int $campaignId = null): void
    {
        if ($campaignId !== null && method_exists($character, 'setCampaign')) {
            /** @var Campaign|null $camp */
            $camp = $this->em->getRepository(Campaign::class)->find($campaignId);
            if (!$camp) {
                throw new \InvalidArgumentException('Campagne introuvable');
            }
            $character->setCampaign($camp);
        }

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

            if ($clan === '') {
                if ($this->setterAllowsNull($character, 'setClan')) {
                    $character->setClan(null);
                } else {
                    $character->setClan('');
                }
            } else {
                $character->setClan($clan);
            }
        }

        $isPlayerRaw = $request->request->get('isPlayer', null);
        if ($isPlayerRaw !== null) {
            $val = strtolower(trim((string) $isPlayerRaw));
            $character->setIsPlayer($val === '1' || $val === 'true' || $val === 'on');
        }

        $locationIdRaw = $request->request->get('locationId', null);
        if (method_exists($character, 'setLocation')) {
            if ($locationIdRaw === null || $locationIdRaw === '') {
                if ($this->setterAllowsNull($character, 'setLocation')) {
                    $character->setLocation(null);
                }
            } elseif (is_numeric($locationIdRaw)) {
                /** @var Location|null $loc */
                $loc = $this->locationRepository->find((int) $locationIdRaw);
                if ($loc) {
                    $character->setLocation($loc);
                }
            }
        }

        $avatarFile = $request->files->get('avatar');
        if ($avatarFile) {
            $clientExt = strtolower((string) $avatarFile->getClientOriginalExtension());

            $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
            if (!in_array($clientExt, $allowedExt, true)) {
                throw new \InvalidArgumentException('Format image non autorisé (jpg, jpeg, png, webp).');
            }

            $ext = $clientExt === 'jpeg' ? 'jpg' : $clientExt;

            $originalBase = pathinfo($avatarFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeBase = (string) $this->slugger->slug($originalBase)->lower();

            $targetDir = rtrim($this->projectDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'image';
            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
                    throw new \RuntimeException('Impossible de créer le dossier public/image');
                }
            }

            $filename = $safeBase . '.' . $ext;
            $i = 2;
            while (file_exists($targetDir . DIRECTORY_SEPARATOR . $filename)) {
                $filename = $safeBase . '-' . $i . '.' . $ext;
                $i++;
            }

            try {
                $avatarFile->move($targetDir, $filename);
            } catch (\Throwable $e) {
                throw new \RuntimeException('Erreur upload avatar: ' . $e->getMessage());
            }

            $character->setAvatarUrl('/image/' . $filename);
        }

        $videoFile = $request->files->get('transitionVideo');
        if ($videoFile) {
            $mime = $videoFile->getMimeType() ?: '';
            $clientExt = strtolower((string) $videoFile->getClientOriginalExtension());
            $guessedExt = strtolower((string) ($videoFile->guessExtension() ?: ''));

            $ext = $guessedExt !== '' ? $guessedExt : $clientExt;

            $allowedMime = ['video/mp4', 'video/webm', 'application/octet-stream'];
            $allowedExt  = ['mp4', 'webm'];

            if (!in_array($mime, $allowedMime, true) && !in_array($ext, $allowedExt, true)) {
                throw new \InvalidArgumentException('Format vidéo non autorisé (mp4, webm).');
            }

            if ($ext === '') $ext = 'mp4';

            $maxBytes = 25 * 1024 * 1024;
            $size = $videoFile->getSize();
            if ($size !== null && $size > $maxBytes) {
                throw new \InvalidArgumentException('Vidéo trop lourde (max 25 Mo).');
            }

            $originalBase = pathinfo($videoFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeBase = (string) $this->slugger->slug($originalBase)->lower();

            $targetDir = rtrim($this->projectDir, '/') . '/public/video';
            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
                    throw new \RuntimeException('Impossible de créer le dossier public/video');
                }
            }

            $filename = $safeBase . '.' . $ext;
            $i = 2;
            while (file_exists($targetDir . '/' . $filename)) {
                $filename = $safeBase . '-' . $i . '.' . $ext;
                $i++;
            }

            try {
                $videoFile->move($targetDir, $filename);
            } catch (\Symfony\Component\HttpFoundation\File\Exception\FileException) {
                throw new \RuntimeException('Erreur upload vidéo');
            }

            if (method_exists($character, 'setTransitionVideoUrl')) {
                $character->setTransitionVideoUrl('/video/' . $filename);
            }
        }
    }
}
