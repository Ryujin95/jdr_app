<?php
// back/src/Entity/CampaignMember.php

namespace App\Entity;

use App\Repository\CampaignMemberRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CampaignMemberRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_campaign_user', columns: ['campaign_id', 'user_id'])]
class CampaignMember
{
    public const ROLE_MJ = 'MJ';
    public const ROLE_PLAYER = 'PLAYER';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'members')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Campaign $campaign = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 20)]
    private string $role = self::ROLE_PLAYER;

    #[ORM\Column]
    private \DateTimeImmutable $joinedAt;

    public function __construct()
    {
        $this->joinedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getCampaign(): ?Campaign { return $this->campaign; }
    public function setCampaign(?Campaign $campaign): self
    {
        $this->campaign = $campaign;
        return $this;
    }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self
    {
        $this->user = $user;
        return $this;
    }

    public function getRole(): string { return $this->role; }
    public function setRole(string $role): self
    {
        $this->role = $role;
        return $this;
    }

    public function getJoinedAt(): \DateTimeImmutable { return $this->joinedAt; }
}
