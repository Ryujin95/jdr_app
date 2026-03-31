<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[UniqueEntity(fields: ['username'], message: 'Ce pseudo est déjà utilisé.')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Assert\NotBlank(message: "L'email est obligatoire.")]
    #[Assert\Email(message: "L'email '{{ value }}' n'est pas valide.")]
    private ?string $email = null;

    /**
     * @var list<string>
     */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    #[Assert\NotBlank(message: "Le mot de passe est obligatoire.")]
    #[Assert\Length(
        min: 8,
        minMessage: "Le mot de passe doit contenir au minimum 8 caractères."
    )]
    #[Assert\Regex(
        pattern: "/[A-Z]/",
        message: "Le mot de passe doit contenir au moins une majuscule."
    )]
    #[Assert\Regex(
        pattern: "/[a-z]/",
        message: "Le mot de passe doit contenir au moins une minuscule."
    )]
    #[Assert\Regex(
        pattern: "/\d/",
        message: "Le mot de passe doit contenir au moins un chiffre."
    )]
    #[Assert\Regex(
        pattern: "/[^A-Za-z0-9]/",
        message: "Le mot de passe doit contenir au moins un caractère spécial."
    )]
    private ?string $password = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Assert\NotBlank(message: "Le pseudo est obligatoire.")]
    #[Assert\Length(
        min: 3,
        max: 30,
        minMessage: "Le pseudo doit contenir au minimum 3 caractères.",
        maxMessage: "Le pseudo doit contenir au maximum 30 caractères."
    )]
    private ?string $username = null;

    #[ORM\Column(type: 'boolean')]
    private bool $deleted = false;

    #[ORM\Column(length: 128, nullable: true)]
    private ?string $resetPasswordToken = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resetPasswordTokenExpiresAt = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $disableTransitions = false;

    #[ORM\Column(length: 20, options: ['default' => 'COMMON_ONLY'])]
    private string $profileCampaignVisibility = 'COMMON_ONLY';

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $lastSeen = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatarUrl = null;

    public function __construct()
    {
        $this->deleted = false;
        $this->disableTransitions = false;
        $this->profileCampaignVisibility = 'COMMON_ONLY';
        $this->lastSeen = null;
        $this->avatarUrl = null;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        return array_unique($roles);
    }

    public function setRoles(array $roles): static
    {
        $this->roles = $roles;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;
        return $this;
    }

    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0" . self::class . "\0password"] = hash('crc32c', (string) $this->password);
        return $data;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;
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

    public function getResetPasswordToken(): ?string
    {
        return $this->resetPasswordToken;
    }

    public function setResetPasswordToken(?string $token): static
    {
        $this->resetPasswordToken = $token;
        return $this;
    }

    public function getResetPasswordTokenExpiresAt(): ?\DateTimeImmutable
    {
        return $this->resetPasswordTokenExpiresAt;
    }

    public function setResetPasswordTokenExpiresAt(?\DateTimeImmutable $expiresAt): static
    {
        $this->resetPasswordTokenExpiresAt = $expiresAt;
        return $this;
    }

    public function isDisableTransitions(): bool
    {
        return $this->disableTransitions;
    }

    public function setDisableTransitions(bool $disableTransitions): static
    {
        $this->disableTransitions = $disableTransitions;
        return $this;
    }

    public function getProfileCampaignVisibility(): string
    {
        return $this->profileCampaignVisibility;
    }

    public function setProfileCampaignVisibility(string $visibility): static
    {
        $allowed = ['ALL_FRIENDS', 'COMMON_ONLY'];
        if (!in_array($visibility, $allowed, true)) {
            throw new \InvalidArgumentException("Invalid profileCampaignVisibility");
        }

        $this->profileCampaignVisibility = $visibility;
        return $this;
    }

    public function getLastSeen(): ?\DateTimeImmutable
    {
        return $this->lastSeen;
    }

    public function setLastSeen(?\DateTimeImmutable $lastSeen): static
    {
        $this->lastSeen = $lastSeen;
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
}
