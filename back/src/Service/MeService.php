<?php
// src/Service/MeService.php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class MeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher
    ) {}

    public function update(User $user, array $data): User
    {
        if (array_key_exists('username', $data) && $data['username'] !== null) {
            $user->setUsername((string) $data['username']);
        }

        if (array_key_exists('email', $data) && $data['email'] !== null) {
            $user->setEmail((string) $data['email']);
        }

        if (!empty($data['password'])) {
            $user->setPassword($this->hasher->hashPassword($user, (string) $data['password']));
        }

        $this->em->flush();
        return $user;
    }
}
