<?php

namespace App\Entity;

use App\Repository\Character\CharacterSecretRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CharacterSecretRepository::class)]
class CharacterSecret
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Character $owner = null;

    #[ORM\Column]
    private ?bool $visibleForPlayer = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $description = null;

    #[ORM\Column]
    private ?bool $isMajor = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOwner(): ?Character
    {
        return $this->owner;
    }

    public function setOwner(?Character $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function isVisibleForPlayer(): ?bool
    {
        return $this->visibleForPlayer;
    }

    public function setVisibleForPlayer(bool $visibleForPlayer): static
    {
        $this->visibleForPlayer = $visibleForPlayer;

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function isMajor(): ?bool
    {
        return $this->isMajor;
    }

    public function setIsMajor(bool $isMajor): static
    {
        $this->isMajor = $isMajor;

        return $this;
    }
}
