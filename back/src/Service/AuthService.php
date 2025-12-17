<?php
// src/Service/AuthService.php

namespace App\Service;

use App\Repository\UserRepository;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class AuthService
{
    public function __construct(
        private UserRepository $repo,
        private UserPasswordHasherInterface $hasher
    ) {}

    public function login(array $data): array
    {
        if (empty($data['email']) || empty($data['password'])) {
            throw new BadRequestHttpException('Email et mot de passe requis');
        }

        $user = $this->repo->findOneBy(['email' => $data['email']]);

        if (!$user || !$this->hasher->isPasswordValid($user, $data['password'])) {
            throw new BadRequestHttpException('Identifiants invalides');
        }

        return [
            'message' => 'Connexion réussie',
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
        ];
    }
}
