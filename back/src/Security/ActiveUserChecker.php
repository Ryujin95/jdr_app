<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\DisabledException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

final class ActiveUserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        $this->assertActive($user);
    }

    public function checkPostAuth(UserInterface $user): void
    {
        $this->assertActive($user);
    }

    private function assertActive(UserInterface $user): void
    {
        if ($user instanceof User && $user->isDeleted()) {
            throw new DisabledException('Account is disabled.');
        }
    }
}
