<?php
// back/src/Entity/Map/CharacterZonePosition.php

namespace App\Entity\Map;

use App\Entity\Character;
use App\Repository\Map\CharacterZonePositionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CharacterZonePositionRepository::class)]
#[ORM\Table(name: 'character_zone_position')]
#[ORM\UniqueConstraint(name: 'uniq_zone_character', columns: ['zone_id', 'character_id'])]
class CharacterZonePosition
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Zone::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Zone $zone = null;

    #[ORM\ManyToOne(targetEntity: Character::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Character $character = null;

    #[ORM\Column(type: 'float')]
    private float $xPercent = 50.0;

    #[ORM\Column(type: 'float')]
    private float $yPercent = 50.0;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getZone(): ?Zone
    {
        return $this->zone;
    }

    public function setZone(Zone $zone): self
    {
        $this->zone = $zone;
        $this->touch();
        return $this;
    }

    public function getCharacter(): ?Character
    {
        return $this->character;
    }

    public function setCharacter(Character $character): self
    {
        $this->character = $character;
        $this->touch();
        return $this;
    }

    public function getXPercent(): float
    {
        return $this->xPercent;
    }

    public function setXPercent(float $xPercent): self
    {
        $this->xPercent = $xPercent;
        $this->touch();
        return $this;
    }

    public function getYPercent(): float
    {
        return $this->yPercent;
    }

    public function setYPercent(float $yPercent): self
    {
        $this->yPercent = $yPercent;
        $this->touch();
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
