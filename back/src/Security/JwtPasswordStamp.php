<?php

namespace App\Security;

use App\Entity\User;

final class JwtPasswordStamp
{
    public const CLAIM = 'auth_stamp';

    public function __construct(private readonly string $secret)
    {
    }

    public function forUser(User $user): string
    {
        return hash_hmac('sha256', 'jwt-password-stamp:'.(string) $user->getPassword(), $this->secret);
    }
}
