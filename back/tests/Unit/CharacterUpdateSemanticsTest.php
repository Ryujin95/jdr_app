<?php

namespace App\Tests\Unit;

use App\Entity\Character;
use App\Entity\Location;
use App\Entity\User;
use App\Service\CharacterService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

final class CharacterUpdateSemanticsTest extends TestCase
{
    public function testOmittedOwnerAndLocationSurviveUpdatesAcrossSupportedMethods(): void
    {
        foreach (['POST', 'PUT', 'PATCH'] as $method) {
            $character = $this->characterWithAssignments();
            $request = Request::create(
                '/',
                $method,
                server: ['CONTENT_TYPE' => 'application/json'],
                content: json_encode(['nickname' => 'Updated']),
            );

            $this->applyPayload($request, $character);

            self::assertSame('Updated', $character->getNickname());
            self::assertSame(101, $character->getOwner()?->getId());
            self::assertSame(202, $character->getLocation()?->getId());
        }
    }

    public function testExplicitEmptyOrNullOwnerAndLocationValuesClearAssignments(): void
    {
        foreach ([
            ['ownerUserId' => '', 'locationId' => ''],
            ['ownerUserId' => null, 'locationId' => null],
        ] as $payload) {
            $character = $this->characterWithAssignments();
            $request = Request::create(
                '/',
                'PATCH',
                server: ['CONTENT_TYPE' => 'application/json'],
                content: json_encode($payload),
            );

            $this->applyPayload($request, $character);

            self::assertNull($character->getOwner());
            self::assertNull($character->getLocation());
        }
    }

    public function testFormPayloadUsesTheSameExplicitRemovalSemantics(): void
    {
        $character = $this->characterWithAssignments();
        $request = Request::create('/', 'POST', [
            'ownerUserId' => '',
            'locationId' => '',
        ]);

        $this->applyPayload($request, $character);

        self::assertNull($character->getOwner());
        self::assertNull($character->getLocation());
    }

    public function testUrlEncodedPatchCanExplicitlyRemoveAssignments(): void
    {
        $character = $this->characterWithAssignments();
        $request = Request::create(
            '/',
            'PATCH',
            server: ['CONTENT_TYPE' => 'application/x-www-form-urlencoded'],
            content: 'ownerUserId=&locationId=',
        );

        $this->applyPayload($request, $character);

        self::assertNull($character->getOwner());
        self::assertNull($character->getLocation());
    }

    public function testMultipartFileOnlyUpdateDoesNotTryToDecodeTheBodyAsJson(): void
    {
        $character = $this->characterWithAssignments();
        $request = Request::create(
            '/',
            'POST',
            server: ['CONTENT_TYPE' => 'multipart/form-data; boundary=unit-test'],
            content: '--unit-test--',
        );

        $this->applyPayload($request, $character);

        self::assertSame(101, $character->getOwner()?->getId());
        self::assertSame(202, $character->getLocation()?->getId());
    }

    private function applyPayload(Request $request, Character $character): void
    {
        $service = (new \ReflectionClass(CharacterService::class))->newInstanceWithoutConstructor();
        $readPayload = new \ReflectionMethod(CharacterService::class, 'getRequestPayload');
        $apply = new \ReflectionMethod(CharacterService::class, 'applyRequestToCharacter');
        $payload = $readPayload->invoke($service, $request);
        $apply->invoke($service, $request, $payload, $character, false, null);
    }

    private function characterWithAssignments(): Character
    {
        $owner = new User();
        (new \ReflectionProperty(User::class, 'id'))->setValue($owner, 101);
        $location = new Location();
        (new \ReflectionProperty(Location::class, 'id'))->setValue($location, 202);

        $character = new Character();
        $character->setIsPlayer(true);
        $character->setOwner($owner);
        $character->setLocation($location);

        return $character;
    }
}
