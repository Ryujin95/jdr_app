<?php
// src/Entity/CampaignMember.php
// (Je te le donne complet uniquement si tu n’en as pas, sinon compare juste les noms: campaign, user, role + getRole())

namespace App\Entity;

use App\Repository\CampaignMemberRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CampaignMemberRepository::class)]
class CampaignMember
{
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
    private string $role = 'Player'; // 'MJ' ou 'Player'

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
}
