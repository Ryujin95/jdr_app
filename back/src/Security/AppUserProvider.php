<?php

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\UserNotFoundException as JwtUserNotFoundException;
use Lexik\Bundle\JWTAuthenticationBundle\Security\User\PayloadAwareUserProviderInterface;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\Exception\UserNotFoundException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/** Resolves login credentials by email and JWT identities by immutable database ID. */
final class AppUserProvider implements PayloadAwareUserProviderInterface, PasswordUpgraderInterface
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly JwtPasswordStamp $passwordStamp,
    ) {
    }

    public function loadUserByIdentifier(string $identifier): UserInterface
    {
        $user = $this->users->findOneBy(['email' => $identifier]);
        if (!$user instanceof User) {
            $exception = new UserNotFoundException('User not found.');
            $exception->setUserIdentifier($identifier);
            throw $exception;
        }

        return $user;
    }

    public function loadUserByIdentifierAndPayload(string $identifier, array $payload): UserInterface
    {
        if (!ctype_digit($identifier) || (int) $identifier < 1) {
            throw new JwtUserNotFoundException('id', $identifier);
        }

        $user = $this->users->find((int) $identifier);
        $providedStamp = $payload[JwtPasswordStamp::CLAIM] ?? null;
        if (!$user instanceof User || !is_string($providedStamp)
            || !hash_equals($this->passwordStamp->forUser($user), $providedStamp)) {
            throw new JwtUserNotFoundException('id', $identifier);
        }

        return $user;
    }

    public function refreshUser(UserInterface $user): UserInterface
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $id = $user->getId();
        $refreshed = $id === null ? null : $this->users->find($id);
        if (!$refreshed instanceof User) {
            $exception = new UserNotFoundException('User not found.');
            $exception->setUserIdentifier((string) $id);
            throw $exception;
        }

        return $refreshed;
    }

    public function supportsClass(string $class): bool
    {
        return $class === User::class || is_subclass_of($class, User::class);
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $this->users->upgradePassword($user, $newHashedPassword);
    }
}
