<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Entity\Map\CharacterZonePosition;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\Map\CharacterZonePositionRepository;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use App\Service\CampaignAuthorization;
use App\Service\CampaignRolePolicy;
use App\Service\ZoneService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;

final class ZoneBatchLoadingTest extends TestCase
{
    public function testMapZoneListLoadsCharactersAndPositionsOnceAndPreservesPayload(): void
    {
        $campaign = $this->createMock(Campaign::class);
        $campaign->method('getId')->willReturn(7);

        $map = $this->createMock(Map::class);
        $map->method('getId')->willReturn(44);
        $map->method('getCampaign')->willReturn($campaign);

        $location = $this->createMock(Location::class);
        $location->method('getId')->willReturn(10);
        $location->method('getCampaign')->willReturn($campaign);

        $character = $this->createMock(Character::class);
        $character->method('getId')->willReturn(501);
        $character->method('getCampaign')->willReturn($campaign);
        $character->method('getLocation')->willReturn($location);
        $character->method('getNickname')->willReturn('Mira');
        $character->method('getAvatarUrl')->willReturn('/uploads/mira.png');

        $firstZone = $this->zone(101, 'north', $map, $location);
        $secondZone = $this->zone(102, 'south', $map, $location);

        $security = $this->createMock(Security::class);
        $security->method('isGranted')->willReturn(true);

        $memberRepository = (new \ReflectionClass(CampaignMemberRepository::class))
            ->newInstanceWithoutConstructor();
        $campaignRepository = (new \ReflectionClass(CampaignRepository::class))
            ->newInstanceWithoutConstructor();
        $authorization = new CampaignAuthorization(
            $security,
            $campaignRepository,
            $memberRepository,
            new CampaignRolePolicy(),
        );

        $mapRepository = $this->createMock(MapRepository::class);
        $mapRepository->method('find')->with(44)->willReturn($map);

        $zoneRepository = $this->createMock(ZoneRepository::class);
        $zoneRepository->method('findForMapEditor')->with($map)->willReturn([$firstZone, $secondZone]);

        $characterRepository = $this->createMock(CharacterRepository::class);
        $characterRepository->expects(self::once())
            ->method('findActiveByLocationIds')
            ->with([10])
            ->willReturn([$character]);

        $positionRepository = $this->createMock(CharacterZonePositionRepository::class);
        $positionRepository->expects(self::once())
            ->method('findIndexedByZoneIds')
            ->with([101, 102])
            ->willReturn([
                101 => [501 => ['xPercent' => 25.0, 'yPercent' => 75.0]],
            ]);

        $service = new ZoneService(
            $this->createMock(EntityManagerInterface::class),
            $zoneRepository,
            $mapRepository,
            $characterRepository,
            $positionRepository,
            $authorization,
        );

        self::assertSame([
            [
                'id' => 101,
                'mapId' => 44,
                'code' => 'north',
                'label' => null,
                'locationId' => 10,
                'topPercent' => 1.0,
                'leftPercent' => 2.0,
                'widthPercent' => 30.0,
                'heightPercent' => 40.0,
                'zoomFactor' => 1.0,
                'enabled' => true,
                'characters' => [[
                    'id' => 501,
                    'nickname' => 'Mira',
                    'avatarUrl' => '/uploads/mira.png',
                    'xPercent' => 25.0,
                    'yPercent' => 75.0,
                ]],
            ],
            [
                'id' => 102,
                'mapId' => 44,
                'code' => 'south',
                'label' => null,
                'locationId' => 10,
                'topPercent' => 1.0,
                'leftPercent' => 2.0,
                'widthPercent' => 30.0,
                'heightPercent' => 40.0,
                'zoomFactor' => 1.0,
                'enabled' => true,
                'characters' => [[
                    'id' => 501,
                    'nickname' => 'Mira',
                    'avatarUrl' => '/uploads/mira.png',
                    'xPercent' => 50.0,
                    'yPercent' => 50.0,
                ]],
            ],
        ], $service->listByMap(44));
    }

    private function zone(int $id, string $code, Map $map, Location $location): Zone
    {
        $zone = $this->createMock(Zone::class);
        $zone->method('getId')->willReturn($id);
        $zone->method('getMap')->willReturn($map);
        $zone->method('getLocation')->willReturn($location);
        $zone->method('getLocationId')->willReturn(10);
        $zone->method('getCode')->willReturn($code);
        $zone->method('getLabel')->willReturn(null);
        $zone->method('getTopPercent')->willReturn(1.0);
        $zone->method('getLeftPercent')->willReturn(2.0);
        $zone->method('getWidthPercent')->willReturn(30.0);
        $zone->method('getHeightPercent')->willReturn(40.0);
        $zone->method('getZoomFactor')->willReturn(1.0);
        $zone->method('isEnabled')->willReturn(true);

        return $zone;
    }
}
