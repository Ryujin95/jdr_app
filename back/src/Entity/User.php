<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
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
     * @var list<string> The user roles
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
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

    #[ORM\Column(length: 255)]
    private ?string $username = null;

    // ✅ AJOUT: token reset password (mdp oublié)
    #[ORM\Column(length: 128, nullable: true)]
    private ?string $resetPasswordToken = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resetPasswordTokenExpiresAt = null;

    /**
     * @var Collection<int, CharacterKnowledge>
     */
    #[ORM\OneToMany(targetEntity: CharacterKnowledge::class, mappedBy: 'viewer')]
    private Collection $characterKnowledge;

    public function __construct()
    {
        $this->characterKnowledge = new ArrayCollection();
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
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);
        return $data;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
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

    // ✅ AJOUT: getters/setters reset password
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

    /**
     * @return Collection<int, CharacterKnowledge>
     */
    public function getCharacterKnowledge(): Collection
    {
        return $this->characterKnowledge;
    }

    public function addCharacterKnowledge(CharacterKnowledge $characterKnowledge): static
    {
        if (!$this->characterKnowledge->contains($characterKnowledge)) {
            $this->characterKnowledge->add($characterKnowledge);
            $characterKnowledge->setViewer($this);
        }

        return $this;
    }

    public function removeCharacterKnowledge(CharacterKnowledge $characterKnowledge): static
    {
        if ($this->characterKnowledge->removeElement($characterKnowledge)) {
            // set the owning side to null (unless already changed)
            if ($characterKnowledge->getViewer() === $this) {
                $characterKnowledge->setViewer(null);
            }
        }

        return $this;
    }
}
