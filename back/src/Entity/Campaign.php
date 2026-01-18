<?php
// back/src/Entity/Campaign.php

namespace App\Entity;

use App\Repository\CampaignRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CampaignRepository::class)]
class Campaign
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $theme = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, CampaignMember> */
    #[ORM\OneToMany(mappedBy: 'campaign', targetEntity: CampaignMember::class, orphanRemoval: true)]
    private Collection $members;

    public function __construct()
    {
        $this->members = new ArrayCollection();
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): ?int { return $this->id; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): self
    {
        $this->title = $title;
        $this->touch();
        return $this;
    }

    public function getTheme(): ?string { return $this->theme; }
    public function setTheme(?string $theme): self
    {
        $this->theme = $theme;
        $this->touch();
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /** @return Collection<int, CampaignMember> */
    public function getMembers(): Collection { return $this->members; }

    public function addMember(CampaignMember $member): self
    {
        if (!$this->members->contains($member)) {
            $this->members->add($member);
            $member->setCampaign($this);
        }
        return $this;
    }

    public function removeMember(CampaignMember $member): self
    {
        if ($this->members->removeElement($member)) {
            if ($member->getCampaign() === $this) {
                $member->setCampaign(null);
            }
        }
        return $this;
    }
}
