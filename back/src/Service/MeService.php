<?php
// src/Service/MeService.php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\String\Slugger\SluggerInterface;

class MeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private SluggerInterface $slugger,
        private string $projectDir,
    ) {
    }

    /**
     * Met à jour les infos du user connecté depuis la Request
     * (username, email, password, préférences, avatar).
     */
    public function updateFromRequest(User $user, Request $request): User
    {
        $contentType = $request->headers->get('Content-Type', '');
        $data = str_contains($contentType, 'multipart/form-data')
            ? $request->request->all()
            : (json_decode($request->getContent() ?: '', true) ?? []);

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

        // préférence désactiver les vidéos de transition
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

        // avatar fichier comme CharacterService
        $avatarFile = $request->files->get('avatar');
        if ($avatarFile) {
            $clientExt = strtolower((string) $avatarFile->getClientOriginalExtension());
            $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];

            if (!in_array($clientExt, $allowedExt, true)) {
                throw new \InvalidArgumentException('Format image non autorisé (jpg, jpeg, png, webp).');
            }

            $ext = $clientExt === 'jpeg' ? 'jpg' : $clientExt;

            $originalBase = pathinfo($avatarFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeBase = (string) $this->slugger->slug($originalBase)->lower();

            if ($safeBase === '') {
                $safeBase = 'avatar-user-' . (string) $user->getId();
            }

            $targetDir = rtrim($this->projectDir, DIRECTORY_SEPARATOR)
                . DIRECTORY_SEPARATOR . 'public'
                . DIRECTORY_SEPARATOR . 'image';

            if (!is_dir($targetDir)) {
                if (!@mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
                    throw new \RuntimeException('Impossible de créer le dossier public/image');
                }
            }

            $filename = $safeBase . '.' . $ext;
            $i = 2;
            while (file_exists($targetDir . DIRECTORY_SEPARATOR . $filename)) {
                $filename = $safeBase . '-' . $i . '.' . $ext;
                $i++;
            }

            try {
                $avatarFile->move($targetDir, $filename);
            } catch (\Throwable $e) {
                throw new \RuntimeException('Erreur upload avatar: ' . $e->getMessage());
            }

            $user->setAvatarUrl('/image/' . $filename);
        }

        $this->em->flush();

        return $user;
    }

    /**
     * Marque l'utilisateur comme actif maintenant.
     */
    public function touchPresence(User $user): void
    {
        if (method_exists($user, 'setLastSeen')) {
            $user->setLastSeen(new \DateTimeImmutable());
            $this->em->flush();
        }
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
