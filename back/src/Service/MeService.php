<?php
// src/Service/MeService.php

namespace App\Service;

use App\Entity\User;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\String\Slugger\SluggerInterface;

class MeService
{
    private bool $passwordChanged = false;

    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private SluggerInterface $slugger,
        private UserInputValidator $inputValidator,
        private string $projectDir,
        private ManagedMediaCleanupService $mediaCleanup,
    ) {
    }

    /**
     * Met à jour les infos du user connecté depuis la Request
     * (username, email, password, préférences, avatar).
     */
    public function updateFromRequest(User $user, Request $request): User
    {
        $this->passwordChanged = false;
        $data = $this->readRequestData($request);
        $allowedFields = ['username', 'email', 'password', 'disableTransitions', 'profileCampaignVisibility'];
        if (array_diff(array_keys($data), $allowedFields) !== []) {
            throw new BadRequestHttpException('Champ de profil non reconnu.');
        }

        // Validate every submitted value before changing the managed entity.
        $username = array_key_exists('username', $data) ? $this->inputValidator->username($data['username']) : null;
        $email = array_key_exists('email', $data) ? $this->inputValidator->email($data['email']) : null;
        $plainPassword = array_key_exists('password', $data) ? $this->inputValidator->password($data['password']) : null;
        $disableTransitions = array_key_exists('disableTransitions', $data)
            ? $this->parseBoolean($data['disableTransitions'])
            : null;
        $visibility = $data['profileCampaignVisibility'] ?? null;
        if (array_key_exists('profileCampaignVisibility', $data)
            && (!is_string($visibility) || !in_array($visibility, ['ALL_FRIENDS', 'COMMON_ONLY'], true))) {
            throw new UnprocessableEntityHttpException('Visibilité de profil invalide.');
        }

        $this->assertUniqueIdentity($user, $email, $username);
        $hashedPassword = $plainPassword !== null ? $this->hasher->hashPassword($user, $plainPassword) : null;

        $avatarFile = $request->files->get('avatar');
        if ($avatarFile) {
            if (!$avatarFile->isValid()) {
                throw new UnprocessableEntityHttpException('Fichier avatar invalide.');
            }
            $clientExt = strtolower((string) $avatarFile->getClientOriginalExtension());
            $allowedExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

            if (!in_array($clientExt, $allowedExt, true)) {
                throw new UnprocessableEntityHttpException('Format image non autorisé (jpg, jpeg, png, webp).');
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
            } catch (\Throwable $exception) {
                throw new \RuntimeException('Échec du téléversement de l’avatar.', 0, $exception);
            }

            $user->setAvatarUrl('/image/' . $filename);
        }

        if ($username !== null) $user->setUsername($username);
        if ($email !== null) $user->setEmail($email);
        if ($hashedPassword !== null) $user->setPassword($hashedPassword);
        if ($disableTransitions !== null) $user->setDisableTransitions($disableTransitions);
        if ($visibility !== null) $user->setProfileCampaignVisibility($visibility);

        try {
            $this->em->flush();
        } catch (UniqueConstraintViolationException $exception) {
            throw new ConflictHttpException('Cette adresse email ou ce pseudo est déjà utilisé.', $exception);
        }

        $this->passwordChanged = $hashedPassword !== null;

        return $user;
    }

    public function requiresReauthentication(): bool
    {
        return $this->passwordChanged;
    }

    private function readRequestData(Request $request): array
    {
        $contentType = strtolower((string) $request->headers->get('Content-Type', ''));
        if (str_starts_with($contentType, 'multipart/form-data')
            || str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
            return $request->request->all();
        }

        $content = $request->getContent();
        if (trim($content) === '') return [];

        try {
            $decoded = json_decode($content, false, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new BadRequestHttpException('Corps JSON invalide.', $exception);
        }

        if (!$decoded instanceof \stdClass) {
            throw new BadRequestHttpException('Le corps doit être un objet JSON.');
        }

        return (array) $decoded;
    }

    private function parseBoolean(mixed $value): bool
    {
        if (is_bool($value)) return $value;
        if ($value === 1 || $value === '1' || $value === 'true') return true;
        if ($value === 0 || $value === '0' || $value === 'false') return false;
        throw new UnprocessableEntityHttpException('Valeur disableTransitions invalide.');
    }

    private function assertUniqueIdentity(User $user, ?string $email, ?string $username): void
    {
        foreach (['email' => $email, 'username' => $username] as $field => $value) {
            if ($value === null) continue;
            $existing = $this->em->getRepository(User::class)->findOneBy([$field => $value]);
            if ($existing instanceof User && $existing->getId() !== $user->getId()) {
                throw new ConflictHttpException($field === 'email' ? 'Cette adresse email est déjà utilisée.' : 'Ce pseudo est déjà utilisé.');
            }
        }
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
        $avatarUrl = $user->getAvatarUrl();
        try {
            $this->em->wrapInTransaction(static function (EntityManagerInterface $em) use ($user): void {
                $em->remove($user);
            });
        } catch (ForeignKeyConstraintViolationException $exception) {
            throw new ConflictHttpException(
                'Le compte est encore lié à des campagnes ou à du contenu. Résolvez ces liens avant la suppression définitive.',
                $exception,
            );
        }

        if (is_string($avatarUrl) && $avatarUrl !== '') {
            $this->mediaCleanup->cleanupAvatarAfterDeletion($avatarUrl);
        }
    }
}
