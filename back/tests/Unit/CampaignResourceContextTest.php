<?php

namespace App\Tests\Unit;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Service\CampaignAuthorization;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class CampaignResourceContextTest extends TestCase
{
    public function testCampaignCanBeDerivedFromCharacterLocationMapAndZone(): void
    {
        $authorization = $this->authorization();
        $campaign = $this->campaign(41);

        $character = new Character();
        $character->setCampaign($campaign);
        self::assertSame($campaign, $authorization->resolveCampaignForResource($character));

        $location = new Location();
        $location->setCampaign($campaign);
        self::assertSame($campaign, $authorization->resolveCampaignForResource($location));

        $map = new Map();
        $map->setCampaign($campaign);
        self::assertSame($campaign, $authorization->resolveCampaignForResource($map));

        $zone = new Zone();
        $zone->setMap($map);
        self::assertSame($campaign, $authorization->resolveCampaignForResource($zone));
    }

    public function testOrphanAndCrossCampaignResourcesAreDenied(): void
    {
        $authorization = $this->authorization();
        $campaignA = $this->campaign(41);
        $campaignB = $this->campaign(42);

        try {
            $authorization->assertResourceBelongsToCampaign(new Location(), 41);
            self::fail('An orphan location must be denied.');
        } catch (AccessDeniedHttpException) {
            self::assertTrue(true);
        }

        $map = new Map();
        $map->setCampaign($campaignA);
        $zone = new Zone();
        $zone->setMap($map);
        $location = new Location();
        $location->setCampaign($campaignB);
        $zone->setLocation($location);

        try {
            $authorization->resolveCampaignForResource($zone);
            self::fail('A zone linked to a location in another campaign must be denied.');
        } catch (AccessDeniedHttpException) {
            self::assertTrue(true);
        }

        $character = new Character();
        $character->setCampaign($campaignA);
        $character->setLocation($location);
        try {
            $authorization->resolveCampaignForResource($character);
            self::fail('A character linked to a location in another campaign must be denied.');
        } catch (AccessDeniedHttpException) {
            self::assertTrue(true);
        }

        try {
            $authorization->assertResourceBelongsToCampaign($map, 42);
            self::fail('A forged campaign ID must be denied.');
        } catch (AccessDeniedHttpException) {
            self::assertTrue(true);
        }
    }

    private function authorization(): CampaignAuthorization
    {
        $reflection = new \ReflectionClass(CampaignAuthorization::class);
        return $reflection->newInstanceWithoutConstructor();
    }

    private function campaign(int $id): Campaign
    {
        $campaign = $this->createMock(Campaign::class);
        $campaign->method('getId')->willReturn($id);
        return $campaign;
    }
}
