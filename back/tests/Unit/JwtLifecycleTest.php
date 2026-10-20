<?php

namespace App\Tests\Unit;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\ActiveUserChecker;
use App\Security\AppUserProvider;
use App\Security\JwtLifecycleSubscriber;
use App\Security\JwtPasswordStamp;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Exception\UserNotFoundException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\DisabledException;

final class JwtLifecycleTest extends TestCase
{
    public function testJwtUsesDatabaseIdAndPasswordBoundStamp(): void
    {
        $user = (new User())->setEmail('before@example.test')->setPassword('encoded-password-one');
        $this->setId($user, 42);
        $stamp = new JwtPasswordStamp('test-secret');
        $event = new JWTCreatedEvent(['id' => 42], $user);

        (new JwtLifecycleSubscriber($stamp))->onJwtCreated($event);

        self::assertSame(42, $event->getData()['id']);
        self::assertSame($stamp->forUser($user), $event->getData()[JwtPasswordStamp::CLAIM]);
        self::assertNotSame('encoded-password-one', $event->getData()[JwtPasswordStamp::CLAIM]);
    }

    public function testJwtResolutionSurvivesEmailChangeBecauseItUsesDatabaseId(): void
    {
        $user = (new User())->setEmail('after@example.test')->setPassword('encoded-password');
        $this->setId($user, 42);
        $users = $this->createMock(UserRepository::class);
        $users->expects(self::once())->method('find')->with(42)->willReturn($user);
        $provider = new AppUserProvider($users, new JwtPasswordStamp('test-secret'));

        $resolved = $provider->loadUserByIdentifierAndPayload('42', [
            JwtPasswordStamp::CLAIM => (new JwtPasswordStamp('test-secret'))->forUser($user),
        ]);

        self::assertSame($user, $resolved);
    }

    public function testLoginStillResolvesTheAccountByEmail(): void
    {
        $user = (new User())->setEmail('player@example.test')->setPassword('encoded-password');
        $users = $this->createMock(UserRepository::class);
        $users->expects(self::once())->method('findOneBy')->with(['email' => 'player@example.test'])->willReturn($user);
        $provider = new AppUserProvider($users, new JwtPasswordStamp('test-secret'));

        self::assertSame($user, $provider->loadUserByIdentifier('player@example.test'));
    }

    public function testJwtIssuedBeforePasswordChangeIsRejected(): void
    {
        $user = (new User())->setEmail('player@example.test')->setPassword('new-password-hash');
        $this->setId($user, 7);
        $users = $this->createMock(UserRepository::class);
        $users->method('find')->with(7)->willReturn($user);
        $provider = new AppUserProvider($users, new JwtPasswordStamp('test-secret'));

        $this->expectException(UserNotFoundException::class);
        $provider->loadUserByIdentifierAndPayload('7', [
            JwtPasswordStamp::CLAIM => hash_hmac('sha256', 'jwt-password-stamp:old-password-hash', 'test-secret'),
        ]);
    }

    public function testDeletedAccountIsRejectedByTheSecurityChecker(): void
    {
        $user = (new User())->setDeleted(true);

        $this->expectException(DisabledException::class);
        (new ActiveUserChecker())->checkPreAuth($user);
    }

    public function testActiveAccountPassesTheSecurityChecker(): void
    {
        $user = new User();
        (new ActiveUserChecker())->checkPreAuth($user);
        self::assertFalse($user->isDeleted());
    }

    private function setId(User $user, int $id): void
    {
        $property = new \ReflectionProperty(User::class, 'id');
        $property->setValue($user, $id);
    }
}
