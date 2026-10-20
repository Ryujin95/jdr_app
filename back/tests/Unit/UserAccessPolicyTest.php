<?php

namespace App\Tests\Unit;

use App\Entity\User;
use App\Security\UserAccessPolicy;
use PHPUnit\Framework\TestCase;

final class UserAccessPolicyTest extends TestCase
{
    public function testOnlySelfOrAdministratorCanViewAccountDetails(): void
    {
        $policy = new UserAccessPolicy();
        $actor = $this->userWithId(12);

        self::assertTrue($policy->canView($actor, 12, false));
        self::assertFalse($policy->canView($actor, 13, false));
        self::assertTrue($policy->canView($actor, 13, true));
    }

    public function testOnlySelfOrAdministratorCanUpdateAccount(): void
    {
        $policy = new UserAccessPolicy();
        $actor = $this->userWithId(12);

        self::assertTrue($policy->canUpdate($actor, 12, false));
        self::assertFalse($policy->canUpdate($actor, 13, false));
        self::assertTrue($policy->canUpdate($actor, 13, true));
    }

    private function userWithId(int $id): User
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn($id);

        return $user;
    }
}
