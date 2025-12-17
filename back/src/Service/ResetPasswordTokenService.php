<?php
// src/Service/ResetPasswordTokenService.php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ResetPasswordTokenService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MailerInterface $mailer,
        private UserPasswordHasherInterface $passwordHasher,
        private LoggerInterface $logger,
        private string $fromEmail,
        private string $frontBaseUrl,
        private int $ttlMinutes = 30,
    ) {}

    public function requestReset(string $email): void
    {
        $from = trim($this->fromEmail);
        if ($from === '') {
            // fallback dev (mais en vrai: mets un expéditeur vérifié Brevo dans MAIL_FROM)
            $from = 'JDR App <akkus.maxime@gmail.com>';
        }

        $email = trim(mb_strtolower($email));

        /** @var User|null $user */
        $user = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        if (!$user) {
            return; // pas d’info leak
        }

        $token = bin2hex(random_bytes(32));
        $expiresAt = new \DateTimeImmutable(sprintf('+%d minutes', $this->ttlMinutes));

        $user->setResetPasswordToken($token);
        $user->setResetPasswordTokenExpiresAt($expiresAt);
        $this->em->flush();

        $resetLink = rtrim($this->frontBaseUrl, '/') . '/reset-password?token=' . urlencode($token);

        $mail = (new Email())
            ->from($from)
            ->to($user->getEmail())
            ->subject('Réinitialisation de mot de passe')
            ->text(
                "Tu as demandé une réinitialisation de mot de passe.\n\n"
                . "Clique sur ce lien : {$resetLink}\n\n"
                . "Ce lien expire dans {$this->ttlMinutes} minutes."
            );

        $this->mailer->send($mail);
        $this->logger->info('Reset password email sent', ['to' => $user->getEmail()]);
    }

    public function getResetInfo(string $token): array
{
    $token = trim($token);
    if ($token === '') {
        throw new \RuntimeException('Token manquant.');
    }

    /** @var User|null $user */
    $user = $this->em->getRepository(User::class)->findOneBy(['resetPasswordToken' => $token]);
    if (!$user) {
        throw new \RuntimeException('Token invalide.');
    }

    $expiresAt = $user->getResetPasswordTokenExpiresAt();
    if (!$expiresAt || $expiresAt < new \DateTimeImmutable()) {
        throw new \RuntimeException('Token expiré.');
    }

    return [
        'username' => $user->getUsername(), // <- ici
        'email' => $user->getEmail(),
        'expiresAt' => $expiresAt->format(\DateTimeInterface::ATOM),
    ];
}


    public function resetPassword(string $token, string $plainPassword): void
    {
        $token = trim($token);
        if ($token === '') {
            throw new \RuntimeException('Token manquant.');
        }

        /** @var User|null $user */
        $user = $this->em->getRepository(User::class)->findOneBy(['resetPasswordToken' => $token]);
        if (!$user) {
            throw new \RuntimeException('Token invalide.');
        }

        $expiresAt = $user->getResetPasswordTokenExpiresAt();
        if (!$expiresAt || $expiresAt < new \DateTimeImmutable()) {
            throw new \RuntimeException('Token expiré.');
        }

        $hashed = $this->passwordHasher->hashPassword($user, $plainPassword);
        $user->setPassword($hashed);

        $user->setResetPasswordToken(null);
        $user->setResetPasswordTokenExpiresAt(null);

        $this->em->flush();
    }
}
