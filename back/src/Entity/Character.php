<?php

namespace App\Entity;

use App\Repository\CharacterRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Entity\User;
use App\Entity\Location;
use App\Entity\Campaign;

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

    #[ORM\Column]
    private bool $deleted = false;

    #[ORM\OneToOne(mappedBy: 'character', targetEntity: CharacterAttributes::class, cascade: ['persist', 'remove'])]
    private ?CharacterAttributes $attributes = null;

    /**
     * Liaison campagne (on met nullable pour ne rien casser au début)
     */
    #[ORM\ManyToOne(targetEntity: Campaign::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Campaign $campaign = null;

    /**
     * @var Collection<int, CharacterSkillValue>
     */
    #[ORM\OneToMany(targetEntity: CharacterSkillValue::class, mappedBy: 'owner')]
    private Collection $characterSkillValues;

    /**
     * Relations sortantes (ce personnage → autres)
     * @var Collection<int, CharacterRelationship>
     */
    #[ORM\OneToMany(targetEntity: CharacterRelationship::class, mappedBy: 'fromCharacter')]
    private Collection $relationshipsFrom;

    /**
     * Relations entrantes (autres → ce personnage)
     * @var Collection<int, CharacterRelationship>
     */
    #[ORM\OneToMany(targetEntity: CharacterRelationship::class, mappedBy: 'toCharacter')]
    private Collection $relationshipsTo;

    /**
     * @var Collection<int, CharacterKnowledge>
     */
    #[ORM\OneToMany(targetEntity: CharacterKnowledge::class, mappedBy: 'target')]
    private Collection $characterKnowledge;

    public function __construct()
    {
        $this->characterSkillValues = new ArrayCollection();
        $this->relationshipsFrom = new ArrayCollection();
        $this->relationshipsTo = new ArrayCollection();
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

    public function getTransitionVideoUrl(): ?string
    {
        return $this->transitionVideoUrl;
    }

    public function setTransitionVideoUrl(?string $transitionVideoUrl): static
    {
        $this->transitionVideoUrl = $transitionVideoUrl;
        return $this;
    }

    // ✅ IMPORTANT : c’est ce que ton CharacterService appelle
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

    public function getAttributes(): ?CharacterAttributes
    {
        return $this->attributes;
    }

    public function setAttributes(?CharacterAttributes $attributes): static
    {
        // garder la synchro du OneToOne
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

    /**
     * @return Collection<int, CharacterRelationship>
     */
    public function getRelationshipsFrom(): Collection
    {
        return $this->relationshipsFrom;
    }

    /**
     * @return Collection<int, CharacterRelationship>
     */
    public function getRelationshipsTo(): Collection
    {
        return $this->relationshipsTo;
    }

    /**
     * @return Collection<int, CharacterKnowledge>
     */
    public function getCharacterKnowledge(): Collection
    {
        return $this->characterKnowledge;
    }

    public function getCampaign(): ?Campaign
    {
        return $this->campaign;
    }

    public function setCampaign(?Campaign $campaign): static
    {
        $this->campaign = $campaign;
        return $this;
    }
}
