<?php

namespace App\Tests\Unit;

use App\Controller\Api\MjRelationshipController;
use App\Service\RelationshipService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpFoundation\Request;

final class RelationshipApiContractTest extends TestCase
{
    public function testPatchAcceptsAndReturnsRelationshipStars(): void
    {
        $service = $this->createMock(RelationshipService::class);
        $saved = [
            'fromCharacterId' => 11,
            'toCharacterId' => 22,
            'type' => 'neutral',
            'affinityScore' => 80,
            'relationshipStars' => 4,
        ];
        $service->expects(self::once())
            ->method('upsertRelationshipStars')
            ->with(7, 11, 22, 4)
            ->willReturn($saved);

        $controller = new MjRelationshipController($service);
        $controller->setContainer(new ContainerBuilder());
        $request = Request::create(
            '/api/mj/relationships?campaignId=7',
            'PATCH',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'fromCharacterId' => 11,
                'toCharacterId' => 22,
                'relationshipStars' => 4,
            ], JSON_THROW_ON_ERROR),
        );

        $response = $controller->upsert($request);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame($saved, json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR));
    }

    public function testLegacyStarsFieldIsNotAcceptedAsAConfirmedUpdate(): void
    {
        $service = $this->createMock(RelationshipService::class);
        $service->expects(self::never())->method('upsertRelationshipStars');

        $controller = new MjRelationshipController($service);
        $controller->setContainer(new ContainerBuilder());
        $request = Request::create(
            '/api/mj/relationships?campaignId=7',
            'PATCH',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'fromCharacterId' => 11,
                'toCharacterId' => 22,
                'stars' => 4,
            ], JSON_THROW_ON_ERROR),
        );

        $response = $controller->upsert($request);

        self::assertSame(400, $response->getStatusCode());
    }
}
