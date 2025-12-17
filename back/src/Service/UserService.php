<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UserService
{
    public function __construct(
        private UserRepository $repo,
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher
    ) {}

    public function list(): array
    {
        return array_map(fn(User $u) => $this->dto($u), $this->repo->findAll());
    }

    public function show(int $id): array
    {
        $u = $this->repo->find($id)
            ?? throw new NotFoundHttpException('Utilisateur introuvable');

        return $this->dto($u, true);
    }

    public function create(array $data): array
    {
        $this->require($data, ['email','password','username']);

        $u = new User();
        $u->setUsername($data['username']);
        $u->setEmail($data['email']);
        $u->setRoles(['ROLE_USER']);
        $u->setPassword($this->hasher->hashPassword($u, $data['password']));

        $this->em->persist($u);
        $this->em->flush();

        return ['message' => 'Utilisateur créé'] + $this->dto($u);
    }

    public function update(int $id, array $data): array
    {
        $u = $this->repo->find($id)
            ?? throw new NotFoundHttpException('Utilisateur introuvable');

        if (isset($data['username'])) $u->setUsername($data['username']);
        if (isset($data['email']))    $u->setEmail($data['email']);
        if (!empty($data['password'])) {
            $u->setPassword($this->hasher->hashPassword($u, $data['password']));
        }

        $this->em->flush();

        return ['message' => 'Profil mis à jour'] + $this->dto($u);
    }

    public function login(array $data): array
    {
        $this->require($data, ['email','password']);

        $u = $this->repo->findOneBy(['email' => $data['email']]);

        if (!$u || !$this->hasher->isPasswordValid($u, $data['password'])) {
            throw new BadRequestHttpException('Identifiants invalides');
        }

        return ['message' => 'Connexion réussie'] + $this->dto($u);
    }

    private function require(array $data, array $fields): void
    {
        foreach ($fields as $f) {
            if (empty($data[$f])) {
                throw new BadRequestHttpException("Champ manquant : $f");
            }
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
