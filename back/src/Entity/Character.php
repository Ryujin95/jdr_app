<?php

namespace App\Entity;

use App\Repository\CharacterRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Entity\User;
use App\Entity\Location;

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

    // ✅ AJOUT VIDEO TRANSITION (même principe que avatarUrl)
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $transitionVideoUrl = null;

    #[ORM\Column]
    private ?bool $isPlayer = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $clan = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $owner = null;

    #[ORM\ManyToOne(targetEntity: Location::class, inversedBy: 'characters')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Location $location = null;

    // SOFT DELETE
    #[ORM\Column]
    private bool $deleted = false;

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
        $this->deleted = false;
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

    // ✅ GET/SET VIDEO TRANSITION
    public function getTransitionVideoUrl(): ?string
    {
        return $this->transitionVideoUrl;
    }

    public function setTransitionVideoUrl(?string $transitionVideoUrl): static
    {
        $this->transitionVideoUrl = $transitionVideoUrl;
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

    public function getClan(): ?string
    {
        return $this->clan;
    }

    public function setClan(?string $clan): static
    {
        $this->clan = $clan;
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

    public function getLocation(): ?Location
    {
        return $this->location;
    }

    public function setLocation(?Location $location): static
    {
        $this->location = $location;
        return $this;
    }

    public function isDeleted(): bool
    {
        return $this->deleted;
    }

    public function setDeleted(bool $deleted): static
    {
        $this->deleted = $deleted;
        return $this;
    }
}
