<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

final class UserService
{
    public function __construct(
        private UserRepository $repo,
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private UserInputValidator $inputValidator,
    ) {}

    public function list(): array
    {
        return array_map(static fn(User $u) => [
            'id' => $u->getId(),
            'username' => $u->getUsername(),
        ], $this->repo->findAll());
    }

    public function show(int $id): array
    {
        $u = $this->repo->find($id)
            ?? throw new NotFoundHttpException('Utilisateur introuvable');

        return $this->dto($u, true);
    }

    public function findUser(int $id): User
    {
        return $this->repo->find($id)
            ?? throw new NotFoundHttpException('Utilisateur introuvable');
    }

    public function create(array $data): array
    {
        $email = $this->inputValidator->email($data['email'] ?? null);
        $username = $this->inputValidator->username($data['username'] ?? null);
        $plainPassword = $this->inputValidator->password($data['password'] ?? null);
        $this->assertUniqueIdentity($email, $username);

        $u = new User();
        $u->setUsername($username);
        $u->setEmail($email);
        $u->setRoles(['ROLE_USER']);
        $u->setPassword($this->hasher->hashPassword($u, $plainPassword));

        $this->em->persist($u);
        $this->flushIdentityChanges();

        return ['message' => 'Utilisateur créé'] + [
            'id' => $u->getId(),
            'username' => $u->getUsername(),
        ];
    }

    public function update(User $u, array $data): array
    {
        $username = array_key_exists('username', $data) ? $this->inputValidator->username($data['username']) : null;
        $email = array_key_exists('email', $data) ? $this->inputValidator->email($data['email']) : null;
        $plainPassword = array_key_exists('password', $data) ? $this->inputValidator->password($data['password']) : null;
        $this->assertUniqueIdentity($email, $username, $u);
        $hashedPassword = $plainPassword !== null ? $this->hasher->hashPassword($u, $plainPassword) : null;

        if ($username !== null) $u->setUsername($username);
        if ($email !== null) $u->setEmail($email);
        if ($hashedPassword !== null) $u->setPassword($hashedPassword);

        $this->flushIdentityChanges();

        return ['message' => 'Profil mis à jour'] + $this->dto($u);
    }

    public function login(array $data): array
    {
        if (!is_string($data['email'] ?? null) || trim($data['email']) === ''
            || !is_string($data['password'] ?? null) || $data['password'] === '') {
            throw new BadRequestHttpException('Identifiants invalides');
        }

        try {
            $email = $this->inputValidator->email($data['email']);
        } catch (\Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException) {
            throw new BadRequestHttpException('Identifiants invalides');
        }

        $u = $this->repo->findOneBy(['email' => $email]);

        if (!$u || !$this->hasher->isPasswordValid($u, $data['password'])) {
            throw new BadRequestHttpException('Identifiants invalides');
        }

        return ['message' => 'Connexion réussie'] + $this->dto($u);
    }

    private function assertUniqueIdentity(?string $email, ?string $username, ?User $except = null): void
    {
        foreach (['email' => $email, 'username' => $username] as $field => $value) {
            if ($value === null) continue;
            $existing = $this->repo->findOneBy([$field => $value]);
            if ($existing && $existing->getId() !== $except?->getId()) {
                throw new ConflictHttpException($field === 'email' ? 'Cette adresse email est déjà utilisée.' : 'Ce pseudo est déjà utilisé.');
            }
        }
    }

    private function flushIdentityChanges(): void
    {
        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException $exception) {
            throw new ConflictHttpException('Cette adresse email ou ce pseudo est déjà utilisé.', $exception);
        }
    }

    private function dto(User $u, bool $withRoles = false): array
    {
        $out = [
            'id' => $u->getId(),
            'username' => $u->getUsername(),
            'email' => $u->getEmail(),
        ];

        if ($withRoles) $out['roles'] = $u->getRoles();

        return $out;
    }
}
