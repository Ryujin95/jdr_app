<?php

namespace App\Tests\Unit;

use App\Service\CharacterKnowledgeVisibilityPolicy;
use PHPUnit\Framework\TestCase;

final class CharacterKnowledgeVisibilityPolicyTest extends TestCase
{
    private CharacterKnowledgeVisibilityPolicy $policy;

    protected function setUp(): void
    {
        $this->policy = new CharacterKnowledgeVisibilityPolicy();
    }

    public function testForeignCampaignMjAndUnsharedNonMemberAreDenied(): void
    {
        self::assertFalse($this->policy->allows(true, false, false, false, false, false));
        // A global ROLE_MJ alone does not set the campaign-MJ decision.
        self::assertFalse($this->policy->allows(true, false, false, false, false, true));
    }

    public function testOwnerCampaignMjAndExplicitlySharedMemberCanSeeField(): void
    {
        self::assertTrue($this->policy->allows(true, false, true, false, true, false));
        self::assertTrue($this->policy->allows(true, false, true, true, false, false));
        self::assertTrue($this->policy->allows(true, false, true, false, false, true));
    }

    public function testNoActorCanSeeFieldsOnAnIncoherentCharacter(): void
    {
        self::assertFalse($this->policy->allows(false, true, true, true, true, true));
    }

    public function testGlobalAdministratorExceptionRequiresValidResourceContext(): void
    {
        self::assertTrue($this->policy->allows(true, true, false, false, false, false));
        self::assertFalse($this->policy->allows(false, true, false, false, false, false));
    }
}
