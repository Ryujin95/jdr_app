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
     * Met à jour les infos du user connecté (username, email, password, préférences).
     */
    public function update(User $user, array $data): User
    {
        // username
        if (\array_key_exists('username', $data)) {
            $username = trim((string) $data['username']);
            if ($username !== '') {
                $user->setUsername($username);
            }
        }

        // email
        if (\array_key_exists('email', $data)) {
            $email = trim((string) $data['email']);
            if ($email !== '') {
                $user->setEmail(mb_strtolower($email));
            }
        }

        // password
        if (!empty($data['password'])) {
            $plainPassword = (string) $data['password'];
            $hashed = $this->hasher->hashPassword($user, $plainPassword);
            $user->setPassword($hashed);
        }

        // ✅ NOUVEAU : préférence désactiver les vidéos de transition
        if (\array_key_exists('disableTransitions', $data)) {
            $val = filter_var(
                $data['disableTransitions'],
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            );

            if ($val !== null && method_exists($user, 'setDisableTransitions')) {
                $user->setDisableTransitions($val);
            }
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
