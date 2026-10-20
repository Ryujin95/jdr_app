<?php

namespace App\Security;

use App\Entity\User;

final class UserAccessPolicy
{
    public function canView(User $actor, int $targetId, bool $isAdmin): bool
    {
        return $isAdmin || $actor->getId() === $targetId;
    }

    public function canUpdate(User $actor, int $targetId, bool $isAdmin): bool
    {
        return $isAdmin || $actor->getId() === $targetId;
    }
}
