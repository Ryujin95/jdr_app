<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\Character;
use App\Entity\User;
use App\Tests\Support\FixtureFactory;
use App\Tests\Support\TestEnvironmentGuard;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class TestIsolationTest extends TestCase
{
    /** @return array<string, array{string, string}> */
    public static function unsafeEnvironmentOverrides(): array
    {
        return [
            'development environment' => ['APP_ENV', 'dev'],
            'development database' => ['DATABASE_URL', 'mysql://localhost/jdr_app'],
            'live mail transport' => ['MAILER_DSN', 'smtp://localhost'],
        ];
    }

    #[DataProvider('unsafeEnvironmentOverrides')]
    public function testRefusesNonIsolatedEnvironment(string $name, string $value): void
    {
        $environment = [
            'APP_ENV' => 'test',
            'DATABASE_URL' => 'sqlite:///:memory:',
            'MAILER_DSN' => 'null://null',
        ];
        $environment[$name] = $value;

        $this->expectException(RuntimeException::class);
        TestEnvironmentGuard::assertSafe($environment, dirname(__DIR__, 2));
    }

    public function testAcceptsDedicatedDatabaseAndNullMailer(): void
    {
        TestEnvironmentGuard::assertSafe([
            'APP_ENV' => 'test',
            'DATABASE_URL' => 'sqlite:///:memory:',
            'MAILER_DSN' => 'null://null',
            'APP_STORAGE_DIR' => '%kernel.project_dir%/var/test',
        ], dirname(__DIR__, 2));

        $this->assertFileExists(dirname(__DIR__, 2).'/tests/Fixtures/jwt/private.pem');
        $this->assertFileExists(dirname(__DIR__, 2).'/tests/Fixtures/jwt/public.pem');
    }

    public function testTemporaryTestFilesStayOutsidePublicUploads(): void
    {
        $projectDir = dirname(__DIR__, 2);
        $storageDir = $projectDir.'/var/test';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0700, true);
        }

        $temporaryFile = tempnam($storageDir, 'phpunit-');
        $this->assertNotFalse($temporaryFile);

        try {
            $resolvedFile = realpath($temporaryFile);
            $resolvedStorage = realpath($storageDir);
            $resolvedPublic = realpath($projectDir.'/public') ?: $projectDir.'/public';

            $this->assertNotFalse($resolvedFile);
            $this->assertNotFalse($resolvedStorage);
            $this->assertStringStartsWith($resolvedStorage.DIRECTORY_SEPARATOR, $resolvedFile);
            $this->assertFalse(str_starts_with($resolvedFile, $resolvedPublic.DIRECTORY_SEPARATOR));
        } finally {
            if (is_file($temporaryFile)) {
                unlink($temporaryFile);
            }
        }
    }

    public function testFixtureFactoryBuildsUnsavedEntities(): void
    {
        $this->assertInstanceOf(User::class, FixtureFactory::user());
        $this->assertInstanceOf(Campaign::class, FixtureFactory::campaign());
        $this->assertInstanceOf(Character::class, FixtureFactory::character());
    }

    public function testAuthorizationFixtureHasCrossedRolesAndLinkedResources(): void
    {
        $scenario = FixtureFactory::authorizationScenario();

        $this->assertCount(2, $scenario['campaigns']);
        $this->assertCount(6, $scenario['users']);
        $this->assertCount(6, $scenario['memberships']);
        $this->assertCount(4, $scenario['characters']);
        $this->assertSame('ROLE_ADMIN', $scenario['users']['admin']->getRoles()[0]);
        $this->assertCount(0, array_filter(
            $scenario['memberships'],
            static fn (CampaignMember $member): bool => $member->getUser() === $scenario['users']['outsider'],
        ));
        $this->assertSame($scenario['campaigns']['beta'], $scenario['memberships'][3]->getCampaign());
        $this->assertSame($scenario['maps']['alpha'], $scenario['zones']['alpha']->getMap());
        $this->assertSame($scenario['characters']['alpha_player'], $scenario['positions'][0]->getCharacter());
        $this->assertSame($scenario['characters']['alpha_player'], $scenario['knowledge'][0]->getTarget());
    }
}
