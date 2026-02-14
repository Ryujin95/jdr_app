<?php
// back/src/Entity/Map/Zone.php

namespace App\Entity\Map;

use App\Repository\Map\ZoneRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ZoneRepository::class)]
#[ORM\Table(name: 'zone')]
class Zone
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    // Une zone appartient à une map
    #[ORM\ManyToOne(targetEntity: Map::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Map $map = null;

    // identifiant "stable" côté front (ex: "zone-rouge")
    #[ORM\Column(length: 80)]
    private string $code;

    #[ORM\Column(length: 255)]
    private string $label;

    // optionnel : si tu veux lier une zone à un Location existant (ton système de lieux)
    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $locationId = null;

    // ✅ positions + tailles en POURCENTAGE (mobile friendly)
    // (ex: 15.25 = 15.25%)
    #[ORM\Column(type: 'float')]
    private float $topPercent = 0.0;

    #[ORM\Column(type: 'float')]
    private float $leftPercent = 0.0;

    #[ORM\Column(type: 'float')]
    private float $widthPercent = 10.0;

    #[ORM\Column(type: 'float')]
    private float $heightPercent = 10.0;

    // optionnel : activer / désactiver une zone
    #[ORM\Column(type: 'boolean')]
    private bool $enabled = true;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
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

    public function getMap(): ?Map
    {
        return $this->map;
    }

    public function setMap(?Map $map): self
    {
        $this->map = $map;
        $this->touch();
        return $this;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): self
    {
        $this->code = trim($code);
        $this->touch();
        return $this;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): self
    {
        $this->label = trim($label);
        $this->touch();
        return $this;
    }

    public function getLocationId(): ?int
    {
        return $this->locationId;
    }

    public function setLocationId(?int $locationId): self
    {
        $this->locationId = $locationId;
        $this->touch();
        return $this;
    }

    public function getTopPercent(): float
    {
        return $this->topPercent;
    }

    public function setTopPercent(float $topPercent): self
    {
        $this->topPercent = $topPercent;
        $this->touch();
        return $this;
    }

    public function getLeftPercent(): float
    {
        return $this->leftPercent;
    }

    public function setLeftPercent(float $leftPercent): self
    {
        $this->leftPercent = $leftPercent;
        $this->touch();
        return $this;
    }

    public function getWidthPercent(): float
    {
        return $this->widthPercent;
    }

    public function setWidthPercent(float $widthPercent): self
    {
        $this->widthPercent = $widthPercent;
        $this->touch();
        return $this;
    }

    public function getHeightPercent(): float
    {
        return $this->heightPercent;
    }

    public function setHeightPercent(float $heightPercent): self
    {
        $this->heightPercent = $heightPercent;
        $this->touch();
        return $this;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): self
    {
        $this->enabled = $enabled;
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
