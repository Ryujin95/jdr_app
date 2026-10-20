<?php

namespace App\Tests\Unit;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Service\CampaignAuthorization;
use App\Service\ZoneService;
use PHPUnit\Framework\TestCase;

final class ZoneDeletionVisibilityTest extends TestCase
{
    public function testDeletedCharactersDoNotReappearInZonePayloads(): void
    {
        $campaign = new Campaign();
        (new \ReflectionProperty(Campaign::class, 'id'))->setValue($campaign, 17);

        $map = (new Map())->setName('Test map')->setImagePath('/uploads/maps/test.png')->setCampaign($campaign);
        $location = (new Location())->setName('Test location')->setCampaign($campaign);
        $active = (new Character())
            ->setNickname('Active')
            ->setCampaign($campaign);
        $deleted = (new Character())
            ->setNickname('Deleted')
            ->setCampaign($campaign)
            ->setDeleted(true);
        $location->addCharacter($active);
        $location->addCharacter($deleted);

        $zone = (new Zone())->setMap($map)->setLocation($location);
        $service = (new \ReflectionClass(ZoneService::class))->newInstanceWithoutConstructor();
        (new \ReflectionProperty(ZoneService::class, 'campaignAuthorization'))
            ->setValue($service, (new \ReflectionClass(CampaignAuthorization::class))->newInstanceWithoutConstructor());

        $payload = (new \ReflectionMethod(ZoneService::class, 'toArray'))->invoke($service, $zone);

        self::assertSame(['Active'], array_column($payload['characters'], 'nickname'));
    }
}
