<?php

namespace App\Tests\Unit;

use App\Controller\Api\MjRelationshipController;
use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\CharacterRelationship;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Character\CharacterRelationshipRepository;
use App\Repository\Character\CharacterRepository;
use App\Service\CampaignAuthorization;
use App\Service\CampaignRolePolicy;
use App\Service\RelationshipService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpFoundation\Request;

final class RelationshipApiContractTest extends TestCase
{
    public function testPatchAcceptsAndReturnsRelationshipStars(): void
    {
        $campaign = (new Campaign())->setTitle('Test campaign');
        (new \ReflectionProperty(Campaign::class, 'id'))->setValue($campaign, 7);
        $campaignRepository = $this->createMock(CampaignRepository::class);
        $campaignRepository->method('find')->with(7)->willReturn($campaign);
        $security = $this->createMock(Security::class);
        $security->method('isGranted')->with('ROLE_ADMIN')->willReturn(true);
        $campaignAuthorization = new CampaignAuthorization(
            $security,
            $campaignRepository,
            (new \ReflectionClass(CampaignMemberRepository::class))->newInstanceWithoutConstructor(),
            new CampaignRolePolicy(),
        );

        $from = (new Character())->setNickname('From')->setCampaign($campaign);
        $to = (new Character())->setNickname('To')->setCampaign($campaign);
        (new \ReflectionProperty(Character::class, 'id'))->setValue($from, 11);
        (new \ReflectionProperty(Character::class, 'id'))->setValue($to, 22);
        $characters = $this->createMock(CharacterRepository::class);
        $characters->method('find')->willReturnMap([[11, $from], [22, $to]]);
        $relationships = $this->createMock(CharacterRelationshipRepository::class);
        $relationships->expects(self::once())
            ->method('findOneByFromTo')
            ->with($from, $to)
            ->willReturn(null);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())
            ->method('persist')
            ->with(self::isInstanceOf(CharacterRelationship::class));
        $entityManager->expects(self::once())->method('flush');
        $service = new RelationshipService(
            $security,
            $entityManager,
            $characters,
            $relationships,
            $campaignAuthorization,
        );
        $saved = [
            'fromCharacterId' => 11,
            'toCharacterId' => 22,
            'type' => 'neutral',
            'affinityScore' => 80,
            'relationshipStars' => 4,
        ];
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

        self::assertSame(200, $response->getStatusCode(), $response->getContent());
        self::assertSame($saved, json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR));
    }

    public function testLegacyStarsFieldIsNotAcceptedAsAConfirmedUpdate(): void
    {
        $service = $this->relationshipServiceForRejectedRequest();

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

    private function relationshipServiceForRejectedRequest(): RelationshipService
    {
        return new RelationshipService(
            $this->createMock(Security::class),
            $this->createMock(EntityManagerInterface::class),
            $this->createMock(CharacterRepository::class),
            $this->createMock(CharacterRelationshipRepository::class),
            new CampaignAuthorization(
                $this->createMock(Security::class),
                $this->createMock(CampaignRepository::class),
                (new \ReflectionClass(CampaignMemberRepository::class))->newInstanceWithoutConstructor(),
                new CampaignRolePolicy(),
            ),
        );
    }
}
