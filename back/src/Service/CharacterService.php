<?php
// src/Service/CharacterService.php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\User;
use App\Repository\Character\CharacterAttributesRepository;
use App\Repository\Character\CharacterRelationshipRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\Character\CharacterSkillValueRepository;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\LocationRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
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
        private CharacterKnowledgeService $characterKnowledgeService,
        private CharacterRelationshipRepository $relationshipRepository,
        private CampaignMemberRepository $campaignMemberRepository,
        private CampaignAuthorization $campaignAuthorization,
        private CharacterFieldPolicy $characterFieldPolicy,
        private string $projectDir,
    ) {}

    public function getCharacterCardsForCurrentUser(?int $locationId = null, ?int $campaignId = null): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Authentification requise.');
        }

        if ($locationId !== null) {
            $location = $this->locationRepository->find($locationId);
            if (!$location instanceof Location) {
                throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException('Lieu introuvable.');
            }
            $campaign = $this->campaignAuthorization->assertResourceRole($location, ['MJ', 'Player']);
            if ($campaignId !== null) {
                $this->campaignAuthorization->assertResourceBelongsToCampaign($location, $campaignId);
            } else {
                $campaignId = (int) $campaign->getId();
            }
        } elseif ($campaignId !== null) {
            $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ', 'Player']);
        } else {
            throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Contexte de campagne requis.');
        }

        // Scope the result in SQL as well as authorizing its context above.
        $characters = $locationId !== null
            ? $this->characterRepository->findByLocationAndCampaignActive($locationId, (int) $campaignId)
            : $this->characterRepository->findActiveInCampaign((int) $campaignId);

        $myCharacter = $this->characterRepository->findActivePlayerCharacterByOwnerInCampaign($user, (int) $campaignId);

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
        if (!$user instanceof User) {
            throw new AccessDeniedException('Authentication required');
        }

        $this->campaignAuthorization->assertResourceRole($character, ['MJ', 'Player']);
        if ($campaignId !== null) {
            $this->campaignAuthorization->assertResourceBelongsToCampaign($character, $campaignId);
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

            // ✅ ICI: on renvoie le secret pour que le front le restore
            'secret'     => method_exists($character, 'getSecret') ? $character->getSecret() : null,

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

        return $this->characterKnowledgeService->filterCharacterPayloadForViewer($user, $character, $data);
    }

    public function createFromRequest(Request $request, ?int $campaignId = null): Character
    {
        $payload = $this->getRequestPayload($request);
        $resolvedCampaignId = $this->resolveCampaignId($payload, $campaignId);
        if ($resolvedCampaignId === null || $resolvedCampaignId <= 0) {
            throw new \InvalidArgumentException('campaignId est obligatoire pour créer un personnage.');
        }
        $this->campaignAuthorization->assertCampaignRole($resolvedCampaignId, ['MJ', 'Player']);
        $canManage = $this->campaignAuthorization->hasCampaignRole($resolvedCampaignId, ['MJ']);
        $this->characterFieldPolicy->assertMayEdit(array_keys($payload), $canManage);

        $character = new Character();
        $this->applyRequestToCharacter($request, $payload, $character, true, $resolvedCampaignId);
        if (!$canManage) {
            $user = $this->currentUser();
            $this->assertUserHasNoActivePlayerCharacterInCampaign($resolvedCampaignId, $user);
            $character->setIsPlayer(true);
            $character->setOwner($user);
        }
        $this->campaignAuthorization->assertResourceRole($character, ['MJ', 'Player']);

        $this->em->persist($character);
        if (
            $character->isPlayer()
            && !$character->isDeleted()
            && $character->getOwner() !== null
            && $character->getCampaign() !== null
        ) {
            $this->flushPlayerCharacterAssignment();
        } else {
            $this->em->flush();
        }

        return $character;
    }

    public function updateFromRequest(Character $character, Request $request, ?int $campaignId = null): Character
    {
        $payload = $this->getRequestPayload($request);
        $campaign = $this->campaignAuthorization->assertCharacterEditor($character);
        $canManage = $this->campaignAuthorization->hasCampaignRole((int) $campaign->getId(), ['MJ']);
        $this->characterFieldPolicy->assertMayEdit(array_keys($payload), $canManage);
        $this->applyRequestToCharacter($request, $payload, $character, false, $campaignId);
        $this->campaignAuthorization->assertCharacterEditor($character);
        if (
            $character->isPlayer()
            && !$character->isDeleted()
            && $character->getOwner() !== null
            && $character->getCampaign() !== null
        ) {
            $this->flushPlayerCharacterAssignment();
        } else {
            $this->em->flush();
        }

        return $character;
    }

    private function currentUser(): User
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Authentification requise.');
        }
        return $user;
    }

    private function assertAdminOrCampaignMj(int $campaignId): void
    {
        $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
    }

    private function assertUserIsPlayerInCampaign(int $campaignId, int $userId): void
    {
        $role = $this->campaignMemberRepository->getRoleForUserInCampaign($campaignId, $userId);
        if ($role !== 'Player') {
            throw new \InvalidArgumentException('Utilisateur non joueur dans cette campagne');
        }
    }

    private function assertUserHasNoActivePlayerCharacterInCampaign(
        int $campaignId,
        User $user,
        ?Character $except = null,
    ): void {
        $existing = $this->characterRepository->findActivePlayerCharacterByOwnerInCampaign(
            $user,
            $campaignId,
            $except,
        );
        if ($existing) {
            $camp = $existing->getCampaign();
            if ($camp && (int) $camp->getId() === (int) $campaignId && !$existing->isDeleted() && $existing->isPlayer()) {
                throw new \InvalidArgumentException('Ce joueur a déjà un personnage dans cette campagne');
            }
        }
    }

    /**
     * The database unique index is the final guard against concurrent assignments.
     * Translate its collision into an API conflict instead of leaking a SQL error.
     */
    private function flushPlayerCharacterAssignment(): void
    {
        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException $exception) {
            throw new ConflictHttpException(
                'Ce joueur possède déjà un personnage actif dans cette campagne.',
                $exception,
            );
        }
    }

    public function assignOwner(Character $character, ?int $userId): array
    {
        $camp = $this->campaignAuthorization->assertResourceRole($character, ['MJ']);
        $campaignId = (int) $camp->getId();

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
        $this->assertUserHasNoActivePlayerCharacterInCampaign($campaignId, $user, $character);

        $character->setOwner($user);
        if ($character->isPlayer() && !$character->isDeleted() && $character->getCampaign() !== null) {
            $this->flushPlayerCharacterAssignment();
        } else {
            $this->em->flush();
        }

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

    private function resolveCampaignId(array $payload, ?int $campaignId): ?int
    {
        if ($campaignId !== null && $campaignId > 0) return $campaignId;

        $raw = $payload['campaignId'] ?? null;
        if ($raw === null || $raw === '') {
            $raw = $payload['campaign_id'] ?? null;
        }

        return is_numeric($raw) ? (int) $raw : null;
    }

    /** Read form, multipart, url-encoded, or JSON request bodies without consuming uploaded files. */
    private function getRequestPayload(Request $request): array
    {
        if ($request->request->count() > 0) {
            return $request->request->all();
        }

        $contentType = strtolower((string) $request->headers->get('Content-Type', ''));
        if (str_starts_with($contentType, 'multipart/form-data')) {
            return [];
        }

        if (str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
            parse_str($request->getContent(), $payload);
            return $payload;
        }

        return $request->getPayload()->all();
    }

    private function applyRequestToCharacter(
        Request $request,
        array $payload,
        Character $character,
        bool $isCreate,
        ?int $campaignId = null,
    ): void
    {
        $resolvedCampaignId = $this->resolveCampaignId($payload, $campaignId);

        if ($isCreate) {
            if (!$resolvedCampaignId) {
                throw new \InvalidArgumentException('campaignId est obligatoire pour créer un personnage.');
            }

            /** @var Campaign|null $camp */
            $camp = $this->campaignAuthorization->assertCampaignRole($resolvedCampaignId, ['MJ', 'Player']);

            $character->setCampaign($camp);
        } else {
            if ($resolvedCampaignId !== null) {
                if ($resolvedCampaignId <= 0) {
                    throw new \InvalidArgumentException('campaignId invalide.');
                }
                $this->campaignAuthorization->assertResourceBelongsToCampaign($character, $resolvedCampaignId);
            }
        }

        $nickname = trim((string) ($payload['nickname'] ?? ''));
        if ($isCreate && $nickname === '') {
            throw new \InvalidArgumentException('nickname est obligatoire');
        }
        if ($nickname !== '') {
            $character->setNickname($nickname);
        }

        $firstname = $payload['firstname'] ?? null;
        if ($firstname !== null) {
            $character->setFirstname(trim((string) $firstname));
        }

        $lastname = $payload['lastname'] ?? null;
        if ($lastname !== null) {
            $character->setLastname(trim((string) $lastname));
        }

        $ageRaw = $payload['age'] ?? null;
        if ($ageRaw !== null) {
            $character->setAge(is_numeric($ageRaw) ? (int) $ageRaw : 0);
        }

        $bio = $payload['biography'] ?? null;
        if ($bio !== null) {
            $character->setBiography((string) $bio);
        }

        $strengths = $payload['strengths'] ?? null;
        if ($strengths !== null) {
            $character->setStrengths((string) $strengths);
        }

        $weaknesses = $payload['weaknesses'] ?? null;
        if ($weaknesses !== null) {
            $character->setWeaknesses((string) $weaknesses);
        }

        // ✅ ICI: SECRET (c’est ça qui te manquait pour que ça SAVE en BD)
        $secret = $payload['secret'] ?? null;
        if ($secret !== null && method_exists($character, 'setSecret')) {
            $character->setSecret((string) $secret);
        }

        $clan = $payload['clan'] ?? null;
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

        $isPlayerRaw = $payload['isPlayer'] ?? null;
        if ($isPlayerRaw !== null) {
            $val = strtolower(trim((string) $isPlayerRaw));
            $character->setIsPlayer($val === '1' || $val === 'true' || $val === 'on');
        }

        $ownerWasSubmitted = array_key_exists('ownerUserId', $payload);
        $ownerUserIdRaw = $payload['ownerUserId'] ?? null;
        if ($ownerWasSubmitted) {
            if (!$character->isPlayer()) {
                $character->setOwner(null);
            } else {
                if ($ownerUserIdRaw !== null && !is_int($ownerUserIdRaw) && !is_string($ownerUserIdRaw)) {
                    throw new \InvalidArgumentException('ownerUserId invalide');
                }
                $ownerUserIdRaw = $ownerUserIdRaw === null ? '' : trim((string) $ownerUserIdRaw);

                if ($ownerUserIdRaw === '') {
                    $character->setOwner(null);
                } else {
                    $ownerUserId = filter_var($ownerUserIdRaw, FILTER_VALIDATE_INT, [
                        'options' => ['min_range' => 1],
                    ]);
                    if ($ownerUserId === false) {
                        throw new \InvalidArgumentException('ownerUserId invalide');
                    }

                    if ($character->getOwner()?->getId() === $ownerUserId) {
                        // An explicit copy of the current assignment is still a no-op.
                    } else {
                        $camp = $character->getCampaign();
                        if (!$camp) {
                            throw new \InvalidArgumentException('Personnage non lié à une campagne');
                        }

                        $campaignIdLocal = (int) $camp->getId();

                        $this->assertAdminOrCampaignMj($campaignIdLocal);

                        /** @var User|null $newOwner */
                        $newOwner = $this->em->getRepository(User::class)->find($ownerUserId);
                        if (!$newOwner) {
                            throw new \InvalidArgumentException('Utilisateur introuvable');
                        }

                        $this->assertUserIsPlayerInCampaign($campaignIdLocal, (int) $newOwner->getId());
                        $this->assertUserHasNoActivePlayerCharacterInCampaign($campaignIdLocal, $newOwner, $character);

                        $character->setOwner($newOwner);
                    }
                }
            }
        }

        if (array_key_exists('locationId', $payload) && method_exists($character, 'setLocation')) {
            $locationIdRaw = $payload['locationId'];
            if ($locationIdRaw === null || $locationIdRaw === '') {
                if ($this->setterAllowsNull($character, 'setLocation')) {
                    $character->setLocation(null);
                } else {
                    throw new \InvalidArgumentException('Ce personnage ne peut pas être désaffecté de son lieu.');
                }
            } elseif (is_int($locationIdRaw) || is_string($locationIdRaw)) {
                $locationId = filter_var($locationIdRaw, FILTER_VALIDATE_INT, [
                    'options' => ['min_range' => 1],
                ]);
                if ($locationId === false) {
                    throw new \InvalidArgumentException('locationId invalide');
                }
                if ($character->getLocation()?->getId() !== $locationId) {
                    /** @var Location|null $loc */
                    $loc = $this->locationRepository->find($locationId);
                    if (!$loc) {
                        throw new \InvalidArgumentException('Lieu introuvable');
                    }
                    $characterCampaignId = $character->getCampaign()?->getId();
                    if ($characterCampaignId === null) {
                        throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Le personnage doit appartenir à une campagne.');
                    }
                    $this->campaignAuthorization->assertResourceBelongsToCampaign($loc, (int) $characterCampaignId);
                    $character->setLocation($loc);
                }
            } else {
                throw new \InvalidArgumentException('locationId invalide');
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
