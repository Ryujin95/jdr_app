<?php

namespace App\Entity;

use App\Repository\CharacterRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Entity\User;

#[ORM\Entity(repositoryClass: CharacterRepository::class)]
#[ORM\Table(name: '`character`')]
class Character
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $lastname = null;

    #[ORM\Column(length: 255)]
    private ?string $firstname = null;

    #[ORM\Column(length: 255)]
    private ?string $nickname = null;

    #[ORM\Column]
    private ?int $age = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $biography = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $strengths = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $weaknesses = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column]
    private ?bool $isPlayer = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'characters')]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $owner = null;

    #[ORM\OneToOne(mappedBy: 'character', targetEntity: CharacterAttributes::class, cascade: ['persist', 'remove'])]
    private ?CharacterAttributes $attributes = null;

    /**
     * @var Collection<int, CharacterSkillValue>
     */
    #[ORM\OneToMany(targetEntity: CharacterSkillValue::class, mappedBy: 'owner')]
    private Collection $characterSkillValues;

    /**
     * @var Collection<int, CharacterRelationship>
     */
    #[ORM\OneToMany(targetEntity: CharacterRelationship::class, mappedBy: 'fromCharacter')]
    private Collection $characterRelationships;

    /**
     * @var Collection<int, CharacterKnowledge>
     */
    #[ORM\OneToMany(targetEntity: CharacterKnowledge::class, mappedBy: 'target')]
    private Collection $characterKnowledge;

    public function __construct()
    {
        $this->characterSkillValues = new ArrayCollection();
        $this->characterRelationships = new ArrayCollection();
        $this->characterKnowledge = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLastname(): ?string
    {
        return $this->lastname;
    }

    public function setLastname(string $lastname): static
    {
        $this->lastname = $lastname;

        return $this;
    }

    public function getFirstname(): ?string
    {
        return $this->firstname;
    }

    public function setFirstname(string $firstname): static
    {
        $this->firstname = $firstname;

        return $this;
    }

    public function getNickname(): ?string
    {
        return $this->nickname;
    }

    public function setNickname(string $nickname): static
    {
        $this->nickname = $nickname;

        return $this;
    }

    public function getAge(): ?int
    {
        return $this->age;
    }

    public function setAge(int $age): static
    {
        $this->age = $age;

        return $this;
    }

    public function getBiography(): ?string
    {
        return $this->biography;
    }

    public function setBiography(string $biography): static
    {
        $this->biography = $biography;

        return $this;
    }

    public function getStrengths(): ?string
    {
        return $this->strengths;
    }

    public function setStrengths(?string $strengths): static
    {
        $this->strengths = $strengths;

        return $this;
    }

    public function getWeaknesses(): ?string
    {
        return $this->weaknesses;
    }

    public function setWeaknesses(?string $weaknesses): static
    {
        $this->weaknesses = $weaknesses;

        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): static
    {
        $this->avatarUrl = $avatarUrl;

        return $this;
    }

    public function isPlayer(): ?bool
    {
        return $this->isPlayer;
    }

    public function setIsPlayer(bool $isPlayer): static
    {
        $this->isPlayer = $isPlayer;

        return $this;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
    }

    public function getAttributes(): ?CharacterAttributes
    {
        return $this->attributes;
    }

    public function setAttributes(?CharacterAttributes $attributes): static
    {
        if ($attributes !== null && $attributes->getCharacter() !== $this) {
            $attributes->setCharacter($this);
        }

        $this->attributes = $attributes;

        return $this;
    }

    /**
     * @return Collection<int, CharacterSkillValue>
     */
    public function getCharacterSkillValues(): Collection
    {
        return $this->characterSkillValues;
    }

    public function addCharacterSkillValue(CharacterSkillValue $characterSkillValue): static
    {
        if (!$this->characterSkillValues->contains($characterSkillValue)) {
            $this->characterSkillValues->add($characterSkillValue);
            $characterSkillValue->setOwner($this);
        }

        return $this;
    }

    public function removeCharacterSkillValue(CharacterSkillValue $characterSkillValue): static
    {
        if ($this->characterSkillValues->removeElement($characterSkillValue)) {
            if ($characterSkillValue->getOwner() === $this) {
                $characterSkillValue->setOwner(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, CharacterRelationship>
     */
    public function getCharacterRelationships(): Collection
    {
        return $this->characterRelationships;
    }

    public function addCharacterRelationship(CharacterRelationship $characterRelationship): static
    {
        if (!$this->characterRelationships->contains($characterRelationship)) {
            $this->characterRelationships->add($characterRelationship);
            $characterRelationship->setFromCharacter($this);
        }

        return $this;
    }

    public function removeCharacterRelationship(CharacterRelationship $characterRelationship): static
    {
        if ($this->characterRelationships->removeElement($characterRelationship)) {
            if ($characterRelationship->getFromCharacter() === $this) {
                $characterRelationship->setFromCharacter(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, CharacterKnowledge>
     */
    public function getCharacterKnowledge(): Collection
    {
        return $this->characterKnowledge;
    }

    public function addCharacterKnowledge(CharacterKnowledge $characterKnowledge): static
    {
        if (!$this->characterKnowledge->contains($characterKnowledge)) {
            $this->characterKnowledge->add($characterKnowledge);
            $characterKnowledge->setTarget($this);
        }

        return $this;
    }

    public function removeCharacterKnowledge(CharacterKnowledge $characterKnowledge): static
    {
        if ($this->characterKnowledge->removeElement($characterKnowledge)) {
            if ($characterKnowledge->getTarget() === $this) {
                $characterKnowledge->setTarget(null);
            }
        }

        return $this;
    }
}
