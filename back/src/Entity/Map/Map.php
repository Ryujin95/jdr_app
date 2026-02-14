<?php

namespace App\Entity\Map;

use App\Repository\Map\MapRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MapRepository::class)]
#[ORM\Table(name: '`map`')]
class Map
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $name;

    // image principale de la carte (ex: /images/maps/atlanta.png)
    #[ORM\Column(length: 255)]
    private string $imagePath;

    // optionnel : description courte
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    // optionnel : actif / désactivé (si tu veux cacher une carte)
    #[ORM\Column(type: 'boolean')]
    private bool $enabled = true;

    /**
     * ✅ AJOUT
     * Zones de la carte (rectangles, polygones plus tard si tu veux)
     * Exemple :
     * [
     *   { "id": "zone-1", "x": 12, "y": 20, "width": 30, "height": 15, "label": "Zone rouge" }
     * ]
     */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $zones = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getImagePath(): string
    {
        return $this->imagePath;
    }

    public function setImagePath(string $imagePath): self
    {
        $this->imagePath = $imagePath;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function setEnabled(bool $enabled): self
    {
        $this->enabled = $enabled;
        return $this;
    }

    // ✅ ZONES

    public function getZones(): ?array
    {
        return $this->zones;
    }

    public function setZones(?array $zones): self
    {
        $this->zones = $zones;
        return $this;
    }
}
