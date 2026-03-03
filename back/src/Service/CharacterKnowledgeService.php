<?php
// src/Service/CharacterKnowledgeService.php

namespace App\Service;

use App\Entity\Character;
use App\Entity\CharacterKnowledge;
use App\Entity\User;
use App\Repository\Character\CharacterKnowledgeRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class CharacterKnowledgeService
{
    private const ALLOWED_FIELDS = ['biography','strengths','weaknesses','secret'];

    public function __construct(
        private EntityManagerInterface $em,
        private CharacterKnowledgeRepository $knowledgeRepository,
        private UserRepository $userRepository,
        private CharacterRepository $characterRepository,
        private Security $security,
    ) {}

    public function grantFromIds(int $viewerId, int $characterId, string $field, ?string $notes = null): CharacterKnowledge
    {
        $viewer = $this->mustFindViewer($viewerId);
        $target = $this->mustFindCharacter($characterId);

        $field = $this->normalizeField($field);

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

        // IMPORTANT: si la colonne knowledgelevel existe, on met une valeur.
        if (method_exists($knowledge, 'setKnowledgeLevel')) {
            $knowledge->setKnowledgeLevel('full');
        }

        if (method_exists($knowledge, 'setNotes')) {
            $knowledge->setNotes($notes);
        }

        $this->em->flush();
        return $knowledge;
    }

    public function revokeFromIds(int $viewerId, int $characterId, string $field): void
    {
        $viewer = $this->mustFindViewer($viewerId);
        $target = $this->mustFindCharacter($characterId);
        $field = $this->normalizeField($field);

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

    public function getAllowedViewerIdsForField(int $characterId, string $field): array
    {
        $target = $this->mustFindCharacter($characterId);
        $field = $this->normalizeField($field);

        $knowledgeList = $this->knowledgeRepository->findBy([
            'target' => $target,
            'field'  => $field,
        ]);

        $ids = [];
        foreach ($knowledgeList as $k) {
            $v = $k->getViewer();
            if ($v instanceof User) $ids[] = $v->getId();
        }
        return $ids;
    }

    public function canViewerSeeField(User $viewer, Character $target, string $field): bool
    {
        $field = $this->normalizeField($field);

        if ($this->security->isGranted('ROLE_ADMIN') || $this->security->isGranted('ROLE_MJ')) {
            return true;
        }

        $owner = method_exists($target, 'getOwner') ? $target->getOwner() : null;
        $isPlayer = method_exists($target, 'isPlayer') ? (bool) $target->isPlayer() : false;

        if ($isPlayer && $owner instanceof User && (int)$owner->getId() === (int)$viewer->getId()) {
            return true;
        }

        $knowledge = $this->knowledgeRepository->findOneBy([
            'viewer' => $viewer,
            'target' => $target,
            'field'  => $field,
        ]);

        return (bool) $knowledge;
    }

    public function filterCharacterPayloadForViewer(User $viewer, Character $target, array $payload): array
    {
        foreach (self::ALLOWED_FIELDS as $field) {
            if (array_key_exists($field, $payload) && !$this->canViewerSeeField($viewer, $target, $field)) {
                $payload[$field] = null;
            }
        }
        return $payload;
    }

    private function normalizeField(string $field): string
    {
        $field = trim(strtolower($field));
        if ($field === '' || !in_array($field, self::ALLOWED_FIELDS, true)) {
            throw new \InvalidArgumentException('Field invalide');
        }
        return $field;
    }

    private function mustFindViewer(int $viewerId): User
    {
        if ($viewerId <= 0) throw new \InvalidArgumentException('viewerId requis');
        $viewer = $this->userRepository->find($viewerId);
        if (!$viewer instanceof User) throw new \RuntimeException('Viewer not found');
        return $viewer;
    }

    private function mustFindCharacter(int $characterId): Character
    {
        if ($characterId <= 0) throw new \InvalidArgumentException('characterId requis');
        $character = $this->characterRepository->find($characterId);
        if (!$character instanceof Character) throw new \RuntimeException('Character not found');
        return $character;
    }
}
