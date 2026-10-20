<?php

declare(strict_types=1);

namespace App\Tests\Support;

use RuntimeException;

final class TestEnvironmentGuard
{
    private const REQUIRED_VALUES = [
        'APP_ENV' => 'test',
        'DATABASE_URL' => 'sqlite:///:memory:',
        'MAILER_DSN' => 'null://null',
        'APP_STORAGE_DIR' => '%kernel.project_dir%/var/test',
    ];

    /** @param array<string, mixed> $environment */
    public static function assertSafe(array $environment, string $projectDir): void
    {
        foreach (self::REQUIRED_VALUES as $name => $expected) {
            if (($environment[$name] ?? null) !== $expected) {
                throw new RuntimeException(sprintf(
                    'Unsafe PHPUnit environment: %s must use the dedicated test value.',
                    $name,
                ));
            }
        }

        $configuredStorageDir = self::normalize($projectDir.'/var/test');
        $resolvedStorageDir = realpath($projectDir.'/var/test');
        $resolvedVarDir = realpath($projectDir.'/var');
        $storageDir = self::normalize($resolvedStorageDir ?: ($resolvedVarDir
            ? $resolvedVarDir.'/test'
            : $configuredStorageDir));
        $resolvedPublicDir = realpath($projectDir.'/public');
        $publicDir = self::normalize($resolvedPublicDir ?: $projectDir.'/public');
        if (self::isInside($publicDir, $storageDir)) {
            throw new RuntimeException('Unsafe PHPUnit environment: test storage cannot be inside public/.');
        }

        foreach (['private.pem', 'public.pem'] as $keyFile) {
            if (!is_file($projectDir.'/tests/Fixtures/jwt/'.$keyFile)) {
                throw new RuntimeException('Unsafe PHPUnit environment: dedicated test JWT keys are missing.');
            }
        }
    }

    private static function isInside(string $parent, string $child): bool
    {
        $parent = rtrim($parent, '/').'/';
        $child = rtrim($child, '/').'/';

        return str_starts_with(strtolower($child), strtolower($parent));
    }

    private static function normalize(string $path): string
    {
        return strtolower(rtrim(str_replace('\\', '/', $path), '/'));
    }
}
