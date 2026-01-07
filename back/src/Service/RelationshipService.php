<?php
// src/Service/RelationshipService.php

namespace App\Service;

use App\Entity\CharacterRelationship;
use App\Repository\CharacterRelationshipRepository;
use App\Repository\CharacterRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

final class RelationshipService
{
    public function __construct(
        private Security $security,
        private EntityManagerInterface $em,
        private CharacterRepository $characterRepository,
        private CharacterRelationshipRepository $relationshipRepository,
    ) {}

    public function getKnownMiniCardsForCharacter(int $fromCharacterId): array
    {
        $this->assertAdminOrMj();

        $from = $this->characterRepository->find($fromCharacterId);
        if (!$from) {
            throw new \InvalidArgumentException('Character not found');
        }

        $rels = $this->relationshipRepository->findKnownCharactersWithScore($from);

        $items = [];
        foreach ($rels as $rel) {
            $to = $rel->getToCharacter();
            if (!$to) {
                continue;
            }

            $score = (int) ($rel->getAffinityScore() ?? 0);
            $type = $rel->getType() ?? 'neutral';

            $items[] = [
                'id' => $to->getId(),
                'nickname' => $to->getNickname(),
                'firstname' => $to->getFirstname(),
                'lastname' => $to->getLastname(),
                'age' => $to->getAge(),
                'avatarUrl' => $to->getAvatarUrl(),
                'clan' => $to->getClan(),
                'isPlayer' => $to->isPlayer(),
                'type' => $type,
                'affinityScore' => $score,
                'relationshipStars' => $this->scoreToStars($score),
            ];
        }

        return $items;
    }

    // ✅ C’EST ÇA QUI MANQUAIT
    public function getCandidatesFor(int $fromCharacterId): array
    {
        $this->assertAdminOrMj();

        $from = $this->characterRepository->find($fromCharacterId);
        if (!$from) {
            throw new \InvalidArgumentException('Character not found');
        }

        // connus actuels (relations sortantes)
        $rels = $this->relationshipRepository->findKnownCharactersWithScore($from);
        $knownIds = [];
        foreach ($rels as $rel) {
            $to = $rel->getToCharacter();
            if ($to) {
                $knownIds[] = $to->getId();
            }
        }

        // IMPORTANT: tu dois avoir findAllActive() dans CharacterRepository
        // Si chez toi la méthode s'appelle autrement, change ici.
        $all = $this->characterRepository->findAllActive();

        $candidates = [];
        foreach ($all as $c) {
            if ($c->getId() === $from->getId()) continue;
            if (in_array($c->getId(), $knownIds, true)) continue;

            $candidates[] = [
                'id' => $c->getId(),
                'nickname' => $c->getNickname(),
                'clan' => $c->getClan(),
                'avatarUrl' => $c->getAvatarUrl(),
            ];
        }

        return $candidates;
    }

    public function addKnown(int $fromCharacterId, int $toCharacterId, ?string $type = null): array
{
    $this->assertAdminOrMj();

    if ($fromCharacterId <= 0 || $toCharacterId <= 0 || $fromCharacterId === $toCharacterId) {
        throw new \InvalidArgumentException('Paramètres invalides');
    }

    $from = $this->characterRepository->find($fromCharacterId);
    $to = $this->characterRepository->find($toCharacterId);
    if (!$from || !$to) {
        throw new \InvalidArgumentException('Character not found');
    }

    $type = trim((string) $type);
    if ($type === '') {
        $type = 'neutral';
    }

    $existing = $this->relationshipRepository->findOneByFromTo($from, $to);
    if (!$existing) {
        $rel = new CharacterRelationship();
        $rel->setFromCharacter($from);
        $rel->setToCharacter($to);
        $rel->setType($type);
        $rel->setAffinityScore(0);
        $this->em->persist($rel);
    } else {
        $existing->setType($type);
    }

    $existingBack = $this->relationshipRepository->findOneByFromTo($to, $from);
    if (!$existingBack) {
        $relBack = new CharacterRelationship();
        $relBack->setFromCharacter($to);
        $relBack->setToCharacter($from);
        $relBack->setType($type);
        $relBack->setAffinityScore(0);
        $this->em->persist($relBack);
    } else {
        $existingBack->setType($type);
    }

    $this->em->flush();

    return ['ok' => true];
}


    public function upsertRelationshipStars(int $fromId, int $toId, int $stars): array
    {
        $this->assertAdminOrMj();

        if ($fromId <= 0 || $toId <= 0 || $fromId === $toId) {
            throw new \InvalidArgumentException('Paramètres invalides');
        }
        if ($stars < 0 || $stars > 5) {
            throw new \InvalidArgumentException('stars doit être entre 0 et 5');
        }

        $from = $this->characterRepository->find($fromId);
        $to = $this->characterRepository->find($toId);
        if (!$from || !$to) {
            throw new \InvalidArgumentException('Character not found');
        }

        $rel = $this->relationshipRepository->findOneByFromTo($from, $to);
        if (!$rel) {
            $rel = new CharacterRelationship();
            $rel->setFromCharacter($from);
            $rel->setToCharacter($to);
            $rel->setType('neutral'); // ✅ obligatoire
            $this->em->persist($rel);
        }

        $score = $this->starsToScore($stars);
        $rel->setAffinityScore($score);

        $this->em->flush();

        return [
            'fromCharacterId' => $fromId,
            'toCharacterId' => $toId,
            'type' => $rel->getType(),
            'affinityScore' => $score,
            'relationshipStars' => $stars,
        ];
    }

    private function assertAdminOrMj(): void
    {
        $isAdminOrMj =
            $this->security->isGranted('ROLE_ADMIN') ||
            $this->security->isGranted('ROLE_MJ');

        if (!$isAdminOrMj) {
            throw new AccessDeniedException('Admin/MJ only');
        }
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
        };
    }
}
