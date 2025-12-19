<?php

namespace App\Entity;

use App\Repository\CharacterRelationshipRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CharacterRelationshipRepository::class)]
class CharacterRelationship
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'characterRelationships')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Character $fromCharacter = null;

    #[ORM\ManyToOne(inversedBy: 'characterRelationships')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Character $toCharacter = null;

    #[ORM\Column(length: 255)]
    private ?string $type = null;

    #[ORM\Column(nullable: true)]
    private ?int $affinityScore = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $notes = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFromCharacter(): ?Character
    {
        return $this->fromCharacter;
    }

    public function setFromCharacter(?Character $fromCharacter): static
    {
        $this->fromCharacter = $fromCharacter;

        return $this;
    }

    public function getToCharacter(): ?Character
    {
        return $this->toCharacter;
    }

    public function setToCharacter(?Character $toCharacter): static
    {
        $this->toCharacter = $toCharacter;

        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getAffinityScore(): ?int
    {
        return $this->affinityScore;
    }

    public function setAffinityScore(?int $affinityScore): static
    {
        $this->affinityScore = $affinityScore;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;

        return $this;
    }
}
