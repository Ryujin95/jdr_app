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

    /**
     * Met à jour les infos du user connecté (username, email, password).
     */
    public function update(User $user, array $data): User
    {
        // username: si présent et non vide, on met à jour
        if (\array_key_exists('username', $data)) {
            $username = trim((string) $data['username']);
            if ($username !== '') {
                $user->setUsername($username);
            }
        }

        // email: si présent et non vide, on met à jour en minuscule
        if (\array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            if ($email !== '') {
                $user->setEmail(mb_strtolower($email));
            }
        }

        // password: si présent et non vide, on le hash
        if (!empty($data['password'])) {
            $plainPassword = (string) $data['password'];
            $hashed = $this->hasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashed);
        }

        $this->em->flush();

        return $user;
    }

    /**
     * Supprime définitivement le user.
     */
    public function delete(User $user): void
    {
        $this->em->remove($user);
        $this->em->flush();
    }
}
