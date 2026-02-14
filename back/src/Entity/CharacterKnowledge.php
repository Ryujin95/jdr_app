<?php

namespace App\Entity;

use App\Repository\Character\CharacterKnowledgeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CharacterKnowledgeRepository::class)]
class CharacterKnowledge
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'characterKnowledge')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $viewer = null;

    #[ORM\ManyToOne(inversedBy: 'characterKnowledge')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Character $target = null;

    #[ORM\Column(length: 255)]
    private ?string $field = null;

    #[ORM\Column(length: 255)]
    private ?string $knowledgelevel = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getViewer(): ?User
    {
        return $this->viewer;
    }

    public function setViewer(?User $viewer): static
    {
        $this->viewer = $viewer;

        return $this;
    }

    public function getTarget(): ?Character
    {
        return $this->target;
    }

    public function setTarget(?Character $target): static
    {
        $this->target = $target;

        return $this;
    }

    public function getField(): ?string
    {
        return $this->field;
    }

    public function setField(string $field): static
    {
        $this->field = $field;

        return $this;
    }

    public function getKnowledgelevel(): ?string
    {
        return $this->knowledgelevel;
    }

    public function setKnowledgelevel(string $knowledgelevel): static
    {
        $this->knowledgelevel = $knowledgelevel;

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
