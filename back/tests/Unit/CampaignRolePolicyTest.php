<?php

namespace App\Tests\Unit;

use App\Service\CampaignRolePolicy;
use PHPUnit\Framework\TestCase;

final class CampaignRolePolicyTest extends TestCase
{
    public function testCampaignMjDoesNotGrantAccessToAnotherCampaign(): void
    {
        $policy = new CampaignRolePolicy();

        self::assertTrue($policy->allows('MJ', ['MJ'], false));
        self::assertFalse($policy->allows(null, ['MJ'], false));
        self::assertFalse($policy->allows('Player', ['MJ'], false));
    }

    public function testPlayerAndAdministratorRulesAreDistinct(): void
    {
        $policy = new CampaignRolePolicy();

        self::assertTrue($policy->allows('Player', ['Player', 'MJ'], false));
        self::assertFalse($policy->allows('Player', ['MJ'], false));
        self::assertTrue($policy->allows(null, ['MJ'], true));
    }

    public function testPlayerCanEditOnlyTheirOwnedPlayerCharacter(): void
    {
        $policy = new CampaignRolePolicy();

        self::assertTrue($policy->canEditCharacter('Player', false, true));
        self::assertFalse($policy->canEditCharacter('Player', false, false));
        self::assertTrue($policy->canEditCharacter('MJ', false, false));
        self::assertFalse($policy->canEditCharacter(null, false, true));
        self::assertTrue($policy->canEditCharacter(null, true, false));
    }

    public function testOnlyCampaignMjCanDeleteAndPlayersAloneCanLeave(): void
    {
        $policy = new CampaignRolePolicy();

        self::assertFalse($policy->allows('Player', ['MJ'], false));
        self::assertTrue($policy->allows('MJ', ['MJ'], false));
        self::assertTrue($policy->canLeaveCampaign('Player'));
        self::assertFalse($policy->canLeaveCampaign('MJ'));
        self::assertFalse($policy->canLeaveCampaign(null));
    }

    public function testMjTransferRequiresCurrentMjAndPlayerTargetInTheCampaign(): void
    {
        $policy = new CampaignRolePolicy();

        self::assertTrue($policy->canTransferMj('MJ', 'Player', true));
        self::assertFalse($policy->canTransferMj('Player', 'Player', true));
        self::assertFalse($policy->canTransferMj('MJ', 'MJ', true));
        self::assertFalse($policy->canTransferMj('MJ', 'Player', false));
    }
}
