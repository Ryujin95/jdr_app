<?php

namespace App\Entity;

use App\Repository\CharacterAttributesRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CharacterAttributesRepository::class)]
class CharacterAttributes
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'attributes', cascade: ['persist', 'remove'])]
    #[ORM\JoinColumn(nullable: false)]
    private ?Character $character = null;

    #[ORM\Column]
    private ?int $strength = null;

    #[ORM\Column]
    private ?int $agility = null;

    #[ORM\Column]
    private ?int $wits = null;

    #[ORM\Column]
    private ?int $empathy = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCharacter(): ?Character
    {
        return $this->character;
    }

    public function setCharacter(Character $character): static
    {
        $this->character = $character;

        return $this;
    }

    public function getStrength(): ?int
    {
        return $this->strength;
    }

    public function setStrength(int $strength): static
    {
        $this->strength = $strength;

        return $this;
    }

    public function getAgility(): ?int
    {
        return $this->agility;
    }

    public function setAgility(int $agility): static
    {
        $this->agility = $agility;

        return $this;
    }

    public function getWits(): ?int
    {
        return $this->wits;
    }

    public function setWits(int $wits): static
    {
        $this->wits = $wits;

        return $this;
    }

    public function getEmpathy(): ?int
    {
        return $this->empathy;
    }

    public function setEmpathy(int $empathy): static
    {
        $this->empathy = $empathy;

        return $this;
    }
}
