<?php

namespace App\Tests\Unit;

use App\Entity\Character;
use App\Entity\Campaign;
use App\Entity\User;
use App\Repository\Character\CharacterRepository;
use App\Service\CharacterService;
use PHPUnit\Framework\TestCase;

final class CharacterAssignmentScopeTest extends TestCase
{
    public function testAssignmentCheckIsScopedToCampaignAndExcludesTheCurrentCharacter(): void
    {
        $owner = new User();
        $currentCharacter = new Character();
        $repository = $this->createMock(CharacterRepository::class);
        $repository->expects(self::once())
            ->method('findActivePlayerCharacterByOwnerInCampaign')
            ->with($owner, 42, $currentCharacter)
            ->willReturn(null);

        $this->assertAssignmentCheckPasses($repository, 42, $owner, $currentCharacter);
    }

    public function testAssignmentCheckRejectsAnotherActiveCharacterInTheSameCampaign(): void
    {
        $owner = new User();
        $currentCharacter = new Character();
        $campaign = new Campaign();
        (new \ReflectionProperty(Campaign::class, 'id'))->setValue($campaign, 42);
        $existingCharacter = (new Character())
            ->setIsPlayer(true)
            ->setCampaign($campaign);
        $repository = $this->createMock(CharacterRepository::class);
        $repository->expects(self::once())
            ->method('findActivePlayerCharacterByOwnerInCampaign')
            ->with($owner, 42, $currentCharacter)
            ->willReturn($existingCharacter);

        $this->expectException(\InvalidArgumentException::class);
        $this->assertAssignmentCheckPasses($repository, 42, $owner, $currentCharacter);
    }

    public function testNewAssignmentDoesNotExcludeAnUnpersistedCharacter(): void
    {
        $owner = new User();
        $repository = $this->createMock(CharacterRepository::class);
        $repository->expects(self::once())
            ->method('findActivePlayerCharacterByOwnerInCampaign')
            ->with($owner, 17, null)
            ->willReturn(null);

        $this->assertAssignmentCheckPasses($repository, 17, $owner, null);
    }

    private function assertAssignmentCheckPasses(
        CharacterRepository $repository,
        int $campaignId,
        User $owner,
        ?Character $except,
    ): void {
        $service = (new \ReflectionClass(CharacterService::class))->newInstanceWithoutConstructor();
        (new \ReflectionProperty(CharacterService::class, 'characterRepository'))->setValue($service, $repository);
        (new \ReflectionMethod(CharacterService::class, 'assertUserHasNoActivePlayerCharacterInCampaign'))
            ->invoke($service, $campaignId, $owner, $except);
    }
}
