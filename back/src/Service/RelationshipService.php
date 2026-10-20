<?php
// src/Service/RelationshipService.php

namespace App\Service;

use App\Entity\CharacterRelationship;
use App\Entity\User;
use App\Repository\Character\CharacterRelationshipRepository;
use App\Repository\Character\CharacterRepository;
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
        private CampaignAuthorization $campaignAuthorization,
    ) {}

    private function getUserOrDeny(): User
    {
        $user = $this->security->getUser();

        if (!$user) {
            throw new AccessDeniedException('Authentication required');
        }

        if (!$user instanceof User) {
            throw new AccessDeniedException('Invalid user');
        }

        return $user;
    }

    private function assertCampaignMjOrAdmin(int $campaignId): void
    {
        $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ']);
    }

    private function assertCharacterInCampaign(int $campaignId, int $characterId): void
    {
        $c = $this->characterRepository->find($characterId);
        if (!$c) {
            throw new \InvalidArgumentException('Character not found');
        }

        $this->campaignAuthorization->assertResourceBelongsToCampaign($c, $campaignId);
    }

    private function assertBothCharactersInSameCampaign(int $campaignId, int $fromId, int $toId): void
    {
        $this->assertCharacterInCampaign($campaignId, $fromId);
        $this->assertCharacterInCampaign($campaignId, $toId);
    }

    public function getKnownMiniCardsForCharacter(int $campaignId, int $fromCharacterId): array
    {
        $this->assertCampaignMjOrAdmin($campaignId);
        $this->assertCharacterInCampaign($campaignId, $fromCharacterId);

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

            $toCampaign = $to->getCampaign();
            if (!$toCampaign || (int) $toCampaign->getId() !== (int) $campaignId) {
                continue;
            }

            $score = (int) ($rel->getAffinityScore() ?? 0);
            $type  = $rel->getType() ?? 'neutral';

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

    public function getCandidatesFor(int $campaignId, int $fromCharacterId): array
    {
        $this->assertCampaignMjOrAdmin($campaignId);
        $this->assertCharacterInCampaign($campaignId, $fromCharacterId);

        $candidatesEntities = $this->characterRepository->findCandidatesForKnownInCampaign(
            $campaignId,
            $fromCharacterId
        );

        $candidates = [];
        foreach ($candidatesEntities as $c) {
            $candidates[] = [
                'id' => $c->getId(),
                'nickname' => $c->getNickname(),
                'clan' => $c->getClan(),
                'avatarUrl' => $c->getAvatarUrl(),
            ];
        }

        return $candidates;
    }

    public function addKnown(int $campaignId, int $fromCharacterId, int $toCharacterId, ?string $type = null): array
    {
        $this->assertCampaignMjOrAdmin($campaignId);

        if ($fromCharacterId <= 0 || $toCharacterId <= 0 || $fromCharacterId === $toCharacterId) {
            throw new \InvalidArgumentException('Paramètres invalides');
        }

        $this->assertBothCharactersInSameCampaign($campaignId, $fromCharacterId, $toCharacterId);

        $from = $this->characterRepository->find($fromCharacterId);
        $to   = $this->characterRepository->find($toCharacterId);

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
            if ($existing->getAffinityScore() === null) {
                $existing->setAffinityScore(0);
            }
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
            if ($existingBack->getAffinityScore() === null) {
                $existingBack->setAffinityScore(0);
            }
        }

        $this->em->flush();

        return ['ok' => true];
    }

    public function removeKnown(int $campaignId, int $fromCharacterId, int $toCharacterId): void
    {
        $this->assertCampaignMjOrAdmin($campaignId);

        $this->assertBothCharactersInSameCampaign($campaignId, $fromCharacterId, $toCharacterId);

        $from = $this->characterRepository->find($fromCharacterId);
        $to   = $this->characterRepository->find($toCharacterId);

        if (!$from || !$to) {
            throw new \InvalidArgumentException('Character not found');
        }

        $rel = $this->relationshipRepository->findOneByFromTo($from, $to);
        if ($rel) {
            $this->em->remove($rel);
        }

        $relBack = $this->relationshipRepository->findOneByFromTo($to, $from);
        if ($relBack) {
            $this->em->remove($relBack);
        }

        $this->em->flush();
    }

    public function upsertRelationshipStars(int $campaignId, int $fromId, int $toId, int $stars): array
    {
        $this->assertCampaignMjOrAdmin($campaignId);

        if ($fromId <= 0 || $toId <= 0 || $fromId === $toId) {
            throw new \InvalidArgumentException('Paramètres invalides');
        }

        if ($stars < 0 || $stars > 5) {
            throw new \InvalidArgumentException('stars doit être entre 0 et 5');
        }

        $this->assertBothCharactersInSameCampaign($campaignId, $fromId, $toId);

        $from = $this->characterRepository->find($fromId);
        $to   = $this->characterRepository->find($toId);

        if (!$from || !$to) {
            throw new \InvalidArgumentException('Character not found');
        }

        $rel = $this->relationshipRepository->findOneByFromTo($from, $to);
        if (!$rel) {
            $rel = new CharacterRelationship();
            $rel->setFromCharacter($from);
            $rel->setToCharacter($to);
            $rel->setType('neutral');
            $rel->setAffinityScore(0);
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

    public function getKnownMiniCardsForViewer(int $campaignId, int $fromCharacterId): array
    {
        // Every viewer must be a member of this campaign, even if their character
        // still points to it after membership was removed.
        $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ', 'Player']);

        // MJ/admin => all campaign characters
        if ($this->campaignAuthorization->hasCampaignRole($campaignId, ['MJ'])) {
            return $this->getKnownMiniCardsForCharacter($campaignId, $fromCharacterId);
        }

        // Joueur => uniquement son perso (owner = user connecté)
        $user = $this->getUserOrDeny();

        $this->assertCharacterInCampaign($campaignId, $fromCharacterId);

        $from = $this->characterRepository->find($fromCharacterId);
        if (!$from) {
            throw new \InvalidArgumentException('Character not found');
        }

        $owner = $from->getOwner();
        if (!$from->isPlayer() || !$owner || (int) $owner->getId() !== (int) $user->getId()) {
            throw new AccessDeniedException('Forbidden');
        }

        // Même payload que MJ (avec étoiles)
        $rels = $this->relationshipRepository->findKnownCharactersWithScore($from);

        $items = [];
        foreach ($rels as $rel) {
            $to = $rel->getToCharacter();
            if (!$to) continue;

            $toCampaign = $to->getCampaign();
            if (!$toCampaign || (int) $toCampaign->getId() !== (int) $campaignId) {
                continue;
            }

            $score = (int) ($rel->getAffinityScore() ?? 0);
            $type  = $rel->getType() ?? 'neutral';

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
}


