<?php

namespace App\Entity;

use App\Repository\SkillRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SkillRepository::class)]
class Skill
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    private ?string $parentAttribute = null;

    /**
     * @var Collection<int, CharacterSkillValue>
     */
    #[ORM\OneToMany(targetEntity: CharacterSkillValue::class, mappedBy: 'skill')]
    private Collection $characterSkillValues;

    public function __construct()
    {
        $this->characterSkillValues = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getParentAttribute(): ?string
    {
        return $this->parentAttribute;
    }

    public function setParentAttribute(string $parentAttribute): static
    {
        $this->parentAttribute = $parentAttribute;

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
            $characterSkillValue->setSkill($this);
        }

        return $this;
    }

    public function removeCharacterSkillValue(CharacterSkillValue $characterSkillValue): static
    {
        if ($this->characterSkillValues->removeElement($characterSkillValue)) {
            // set the owning side to null (unless already changed)
            if ($characterSkillValue->getSkill() === $this) {
                $characterSkillValue->setSkill(null);
            }
        }

        return $this;
    }
}
