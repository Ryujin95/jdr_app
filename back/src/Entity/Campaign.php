<?php
// back/src/Entity/Campaign/Campaign.php (ou garde ton chemin actuel si tu ne bouges pas les dossiers)

namespace App\Entity;

use App\Repository\Campaign\CampaignRepository;
use App\Entity\Map\Map;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CampaignRepository::class)]
#[ORM\HasLifecycleCallbacks]
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

    #[ORM\Column(length: 12, unique: true, nullable: true)]
    private ?string $joinCode = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, CampaignMember> */
    #[ORM\OneToMany(mappedBy: 'campaign', targetEntity: CampaignMember::class, orphanRemoval: true)]
    private Collection $members;

    // Une campagne peut avoir une map (nullable = pas de map au début)
    #[ORM\ManyToOne(targetEntity: Map::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Map $map = null;

    public function __construct()
    {
        $this->members = new ArrayCollection();
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getTheme(): ?string
    {
        return $this->theme;
    }

    public function setTheme(?string $theme): self
    {
        $this->theme = $theme;
        return $this;
    }

    public function getJoinCode(): ?string
    {
        return $this->joinCode;
    }

    public function setJoinCode(?string $joinCode): self
    {
        $this->joinCode = $joinCode;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    /** @return Collection<int, CampaignMember> */
    public function getMembers(): Collection
    {
        return $this->members;
    }

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

    public function getMap(): ?Map
    {
        return $this->map;
    }

    public function setMap(?Map $map): self
    {
        $this->map = $map;
        return $this;
    }

    public function delete(): void
    {
        // IMPORTANT: ne pas modifier la collection pendant le foreach
        foreach (new ArrayCollection($this->members->toArray()) as $member) {
            $this->removeMember($member);
        }
    }
}
