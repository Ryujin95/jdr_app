<?php

namespace App\Tests\Unit;

use App\Entity\Campaign;
use App\Entity\Map\Map;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use App\Service\CampaignAuthorization;
use App\Service\CampaignRolePolicy;
use App\Service\ManagedMediaCleanupService;
use App\Service\MapService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;

final class MapDeletionOrderingTest extends TestCase
{
    public function testImageCleanupRunsOnlyAfterTheSqlTransactionReturns(): void
    {
        $map = $this->mapFixture();
        $em = $this->createMock(EntityManagerInterface::class);
        $transactionCommitted = false;
        $em->expects(self::once())
            ->method('wrapInTransaction')
            ->willReturnCallback(static function (callable $operation) use ($em, &$transactionCommitted): void {
                $operation($em);
                $transactionCommitted = true;
            });
        $em->expects(self::once())->method('remove')->with($map);

        $cleanup = $this->createMock(ManagedMediaCleanupService::class);
        $cleanup->expects(self::once())
            ->method('cleanupMapImageAfterDeletion')
            ->with('/uploads/maps/map.png')
            ->willReturnCallback(static function () use (&$transactionCommitted): void {
                self::assertTrue($transactionCommitted);
            });

        $service = $this->mapService($em, $map, $cleanup);
        $service->delete(self::createStub(\App\Entity\User::class), 5);
    }

    public function testSqlFailurePreventsImageCleanup(): void
    {
        $map = $this->mapFixture();
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::once())
            ->method('wrapInTransaction')
            ->willReturnCallback(static function (callable $operation) use ($em): void {
                $operation($em);
            });
        $em->expects(self::once())
            ->method('remove')
            ->with($map)
            ->willThrowException(new \RuntimeException('simulated SQL failure'));

        $cleanup = $this->createMock(ManagedMediaCleanupService::class);
        $cleanup->expects(self::never())->method('cleanupMapImageAfterDeletion');

        $service = $this->mapService($em, $map, $cleanup);
        $this->expectException(\RuntimeException::class);
        $service->delete(self::createStub(\App\Entity\User::class), 5);
    }

    private function mapService(
        EntityManagerInterface $em,
        Map $map,
        ManagedMediaCleanupService $cleanup,
    ): MapService {
        $mapRepository = $this->createMock(MapRepository::class);
        $mapRepository->expects(self::once())->method('find')->with(5)->willReturn($map);
        $zoneRepository = $this->createMock(ZoneRepository::class);
        $zoneRepository->expects(self::once())->method('findBy')->with(['map' => $map])->willReturn([]);

        $security = $this->createMock(Security::class);
        $security->expects(self::once())->method('isGranted')->with('ROLE_ADMIN')->willReturn(true);
        $authorization = new CampaignAuthorization(
            $security,
            (new \ReflectionClass(CampaignRepository::class))->newInstanceWithoutConstructor(),
            (new \ReflectionClass(CampaignMemberRepository::class))->newInstanceWithoutConstructor(),
            new CampaignRolePolicy(),
        );

        return new MapService($em, $mapRepository, $zoneRepository, $authorization, sys_get_temp_dir(), $cleanup);
    }

    private function mapFixture(): Map
    {
        $campaign = (new Campaign())->setTitle('Campaign');
        (new \ReflectionProperty(Campaign::class, 'id'))->setValue($campaign, 17);

        return (new Map())
            ->setName('Map')
            ->setImagePath('/uploads/maps/map.png')
            ->setCampaign($campaign);
    }
}
