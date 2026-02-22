<?php
// src/Entity/Friendship.php

namespace App\Entity;

use App\Repository\FriendshipRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FriendshipRepository::class)]
#[ORM\Table(name: 'friendship')]
#[ORM\UniqueConstraint(name: 'uniq_friend_pair', columns: ['user_low_id', 'user_high_id'])]
class Friendship
{
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_ACCEPTED = 'ACCEPTED';
    public const STATUS_BLOCKED = 'BLOCKED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    // user_low_id / user_high_id : évite les doublons (A-B = B-A)
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_low_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $userLow = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_high_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $userHigh = null;

    // qui a initié la demande (peut être low ou high)
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'requested_by_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $requestedBy = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $acceptedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getUserLow(): ?User { return $this->userLow; }
    public function setUserLow(User $u): self { $this->userLow = $u; return $this; }

    public function getUserHigh(): ?User { return $this->userHigh; }
    public function setUserHigh(User $u): self { $this->userHigh = $u; return $this; }

    public function getRequestedBy(): ?User { return $this->requestedBy; }
    public function setRequestedBy(User $u): self { $this->requestedBy = $u; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $s): self { $this->status = $s; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $d): self { $this->createdAt = $d; return $this; }

    public function getAcceptedAt(): ?\DateTimeImmutable { return $this->acceptedAt; }
    public function setAcceptedAt(?\DateTimeImmutable $d): self { $this->acceptedAt = $d; return $this; }

    /**
     * Renvoie l'autre User dans la relation (par rapport à $me).
     */
    public function getOther(User $me): User
    {
        $meId = $me->getId();
        if ($this->userLow && $this->userLow->getId() === $meId) return $this->userHigh;
        return $this->userLow;
    }

    /**
     * Helper: construit une paire low/high à partir de 2 users.
     */
    public static function orderPair(User $a, User $b): array
    {
        if ($a->getId() === null || $b->getId() === null) {
            throw new \InvalidArgumentException('Users must be persisted first');
        }
        return ($a->getId() < $b->getId())
            ? [$a, $b]
            : [$b, $a];
    }
}
