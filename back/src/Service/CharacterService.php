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
use App\Repository\Campaign\CampaignMemberRepository; // ✅ FIX IMPORTANT (bon namespace)
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
        private CampaignMemberRepository $campaignMemberRepository,
        private string $projectDir,
    ) {}

    public function getCharacterCardsForCurrentUser(?int $locationId = null, ?int $campaignId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) return [];

        $characters = $locationId !== null
            ? $this->characterRepository->findByLocationIdActive($locationId)
            : $this->characterRepository->findAllActive();

        if ($campaignId !== null) {
            $characters = array_values(array_filter($characters, static function (Character $c) use ($campaignId) {
                $camp = $c->getCampaign();
                return $camp && $camp->getId() === $campaignId;
            }));
        }

        $myCharacter = $this->characterRepository->findActivePlayerCharacterByOwner($user);
        if ($campaignId !== null && $myCharacter) {
            $myCamp = $myCharacter->getCampaign();
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
            if ($character->isPlayer() && $character->getOwner()) {
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

            $camp = $character->getCampaign();

            $cards[] = [
                'id'        => $character->getId(),
                'nickname'  => $character->getNickname(),
                'firstname' => $character->getFirstname(),
                'lastname'  => $character->getLastname(),
                'age'       => $character->getAge(),
                'avatarUrl' => $character->getAvatarUrl(),
                'transitionVideoUrl' => $character->getTransitionVideoUrl(),
                'isPlayer'  => $character->isPlayer(),
                'clan'      => $character->getClan(),
                'owner'     => $ownerPayload,

                'campaign' => $camp ? [
                    'id' => $camp->getId(),
                    'title' => method_exists($camp, 'getTitle') ? $camp->getTitle() : null,
                ] : null,

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

    private function starsToScore(int $stars): int
    {
        return match ($stars) {
            0 => 0,
            1 => 20,
            2 => 40,
            3 => 60,
            4 => 80,
            5 => 100,
            default => 0,
        };
    }

    public function getCharacterDetailForCurrentUser(Character $character, ?int $campaignId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        if ($campaignId !== null) {
            $campCheck = $character->getCampaign();
            if (!$campCheck || $campCheck->getId() !== $campaignId) {
                throw new AccessDeniedException('Forbidden');
            }
        }

        $camp = $character->getCampaign();

        $data = [
            'id'        => $character->getId(),
            'nickname'  => $character->getNickname(),
            'firstname' => $character->getFirstname(),
            'lastname'  => $character->getLastname(),
            'age'       => $character->getAge(),
            'avatarUrl' => $character->getAvatarUrl(),
            'transitionVideoUrl' => $character->getTransitionVideoUrl(),
            'isPlayer'  => $character->isPlayer(),
            'clan'      => $character->getClan(),
            'biography'  => $character->getBiography(),
            'strengths'  => $character->getStrengths(),
            'weaknesses' => $character->getWeaknesses(),

            'campaign' => $camp ? [
                'id' => $camp->getId(),
                'title' => method_exists($camp, 'getTitle') ? $camp->getTitle() : null,
            ] : null,
        ];

        if ($character->isPlayer() && $character->getOwner()) {
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

        if ($character->getLocation()) {
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

    private function assertAdminOrCampaignMj(int $campaignId): void
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        if ($this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        if (!$this->campaignMemberRepository->isUserMjInCampaign($campaignId, (int) $user->getId())) {
            throw new AccessDeniedException('MJ only');
        }
    }

    private function assertUserIsPlayerInCampaign(int $campaignId, int $userId): void
    {
        $role = $this->campaignMemberRepository->getRoleForUserInCampaign($campaignId, $userId);
        if ($role !== 'Player') {
            throw new \InvalidArgumentException('Utilisateur non joueur dans cette campagne');
        }
    }

    private function assertUserHasNoActivePlayerCharacterInCampaign(int $campaignId, User $user): void
    {
        $existing = $this->characterRepository->findActivePlayerCharacterByOwner($user);
        if ($existing) {
            $camp = $existing->getCampaign();
            if ($camp && (int) $camp->getId() === (int) $campaignId && !$existing->isDeleted() && $existing->isPlayer()) {
                throw new \InvalidArgumentException('Ce joueur a déjà un personnage dans cette campagne');
            }
        }
    }

    public function assignOwner(Character $character, ?int $userId): array
    {
        $camp = $character->getCampaign();
        if (!$camp) {
            throw new \InvalidArgumentException('Le personnage n’est pas lié à une campagne');
        }

        $campaignId = (int) $camp->getId();
        $this->assertAdminOrCampaignMj($campaignId);

        if ($userId === null) {
            $character->setOwner(null);
            $this->em->flush();

            return ['id' => $character->getId(), 'owner' => null];
        }

        /** @var User|null $user */
        $user = $this->em->getRepository(User::class)->find($userId);
        if (!$user) {
            throw new \InvalidArgumentException('Utilisateur introuvable');
        }

        $this->assertUserIsPlayerInCampaign($campaignId, (int) $user->getId());
        $this->assertUserHasNoActivePlayerCharacterInCampaign($campaignId, $user);

        $character->setOwner($user);
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

    private function resolveCampaignId(Request $request, ?int $campaignId): ?int
    {
        if ($campaignId !== null && $campaignId > 0) return $campaignId;

        $raw = $request->request->get('campaignId');
        if ($raw === null || $raw === '') {
            $raw = $request->request->get('campaign_id');
        }

        return is_numeric($raw) ? (int) $raw : null;
    }

    private function applyRequestToCharacter(Request $request, Character $character, bool $isCreate, ?int $campaignId = null): void
    {
        $resolvedCampaignId = $this->resolveCampaignId($request, $campaignId);

        if ($isCreate) {
            if (!$resolvedCampaignId) {
                throw new \InvalidArgumentException('campaignId est obligatoire pour créer un personnage.');
            }

            /** @var Campaign|null $camp */
            $camp = $this->em->getRepository(Campaign::class)->find($resolvedCampaignId);
            if (!$camp) {
                throw new \InvalidArgumentException('Campagne introuvable');
            }

            $character->setCampaign($camp);
        } else {
            if ($resolvedCampaignId) {
                /** @var Campaign|null $camp */
                $camp = $this->em->getRepository(Campaign::class)->find($resolvedCampaignId);
                if (!$camp) {
                    throw new \InvalidArgumentException('Campagne introuvable');
                }
                $character->setCampaign($camp);
            }
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

        // ✅ AJOUT: ownerUserId (assignation du joueur) -> enregistre en BD
        $ownerUserIdRaw = $request->request->get('ownerUserId', null);
        if ($ownerUserIdRaw !== null) {

            // si pas joueur => on force null
            if (!$character->isPlayer()) {
                $character->setOwner(null);
            } else {
                $ownerUserIdRaw = trim((string) $ownerUserIdRaw);

                // vide => on retire l'owner
                if ($ownerUserIdRaw === '') {
                    $character->setOwner(null);
                } else {
                    if (!is_numeric($ownerUserIdRaw)) {
                        throw new \InvalidArgumentException('ownerUserId invalide');
                    }

                    $camp = $character->getCampaign();
                    if (!$camp) {
                        throw new \InvalidArgumentException('Personnage non lié à une campagne');
                    }

                    $campaignIdLocal = (int) $camp->getId();

                    // sécurité: MJ de la campagne ou admin
                    $this->assertAdminOrCampaignMj($campaignIdLocal);

                    /** @var User|null $newOwner */
                    $newOwner = $this->em->getRepository(User::class)->find((int) $ownerUserIdRaw);
                    if (!$newOwner) {
                        throw new \InvalidArgumentException('Utilisateur introuvable');
                    }

                    // doit être Player dans cette campagne
                    $this->assertUserIsPlayerInCampaign($campaignIdLocal, (int) $newOwner->getId());

                    // ne doit pas déjà avoir un perso joueur dans cette campagne
                    $this->assertUserHasNoActivePlayerCharacterInCampaign($campaignIdLocal, $newOwner);

                    $character->setOwner($newOwner);
                }
            }
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

            $targetDir = rtrim($this->projectDir, DIRECTORY_SEPARATOR)
                . DIRECTORY_SEPARATOR . 'public'
                . DIRECTORY_SEPARATOR . 'image';

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

            $targetDir = rtrim($this->projectDir, DIRECTORY_SEPARATOR)
                . DIRECTORY_SEPARATOR . 'public'
                . DIRECTORY_SEPARATOR . 'video';

            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
                    throw new \RuntimeException('Impossible de créer le dossier public/video');
                }
            }

            $filename = $safeBase . '.' . $ext;
            $i = 2;
            while (file_exists($targetDir . DIRECTORY_SEPARATOR . $filename)) {
                $filename = $safeBase . '-' . $i . '.' . $ext;
                $i++;
            }

            try {
                $videoFile->move($targetDir, $filename);
            } catch (\Throwable) {
                throw new \RuntimeException('Erreur upload vidéo');
            }

            $character->setTransitionVideoUrl('/video/' . $filename);
        }
    }
}
