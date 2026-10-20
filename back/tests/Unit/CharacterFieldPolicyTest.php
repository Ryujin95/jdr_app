<?php

namespace App\Tests\Unit;

use App\Service\CharacterFieldPolicy;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class CharacterFieldPolicyTest extends TestCase
{
    public function testPlayerCannotSetPrivilegedCharacterFields(): void
    {
        $policy = new CharacterFieldPolicy();

        foreach (['secret', 'isPlayer', 'ownerUserId', 'locationId'] as $field) {
            try {
                $policy->assertMayEdit([$field], false);
                self::fail(sprintf('Expected field "%s" to be denied.', $field));
            } catch (AccessDeniedHttpException) {
                self::assertTrue(true);
            }
        }
    }

    public function testPlayerCanEditOrdinaryFieldsAndCampaignMjCanEditPrivilegedFields(): void
    {
        $policy = new CharacterFieldPolicy();

        $policy->assertMayEdit(['nickname', 'biography', 'avatar'], false);
        $policy->assertMayEdit(['secret', 'isPlayer', 'ownerUserId', 'locationId'], true);

        self::assertTrue(true);
    }
}
