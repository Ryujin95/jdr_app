<?php

namespace App\Tests\Unit;

use App\Service\ManagedMediaCleanupService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class MapFileCleanupTest extends TestCase
{
    public function testOnlyFilesInsideManagedMapUploadDirectoryAreRemoved(): void
    {
        $root = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'storyforge-map-cleanup-' . bin2hex(random_bytes(6));
        $uploadDirectory = $root . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'maps';
        mkdir($uploadDirectory, 0777, true);
        $managedFile = $uploadDirectory . DIRECTORY_SEPARATOR . 'managed.png';
        $outsideFile = $root . DIRECTORY_SEPARATOR . 'outside.png';
        file_put_contents($managedFile, 'managed fixture');
        file_put_contents($outsideFile, 'outside fixture');

        try {
            $service = (new \ReflectionClass(ManagedMediaCleanupService::class))->newInstanceWithoutConstructor();
            (new \ReflectionProperty(ManagedMediaCleanupService::class, 'projectDir'))->setValue($service, $root);
            (new \ReflectionProperty(ManagedMediaCleanupService::class, 'logger'))
                ->setValue($service, $this->createMock(LoggerInterface::class));
            $service->cleanupMapImageAfterDeletion('/uploads/maps/managed.png');
            $service->cleanupMapImageAfterDeletion('/uploads/maps/../outside.png');

            self::assertFileDoesNotExist($managedFile);
            self::assertFileExists($outsideFile);
        } finally {
            @unlink($managedFile);
            @unlink($outsideFile);
            @rmdir($uploadDirectory);
            @rmdir(dirname($uploadDirectory));
            @rmdir(dirname(dirname($uploadDirectory)));
            @rmdir($root);
        }
    }

    public function testCleanupFailureIsReportedAndKeepsTheFileForLaterRecovery(): void
    {
        $root = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'storyforge-map-cleanup-' . bin2hex(random_bytes(6));
        $uploadDirectory = $root . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'maps';
        mkdir($uploadDirectory, 0777, true);
        $managedFile = $uploadDirectory . DIRECTORY_SEPARATOR . 'managed.png';
        file_put_contents($managedFile, 'managed fixture');

        try {
            $logger = $this->createMock(LoggerInterface::class);
            $logger->expects(self::once())
                ->method('error')
                ->with(
                    'Map was deleted from the database, but its image cleanup failed.',
                    ['imagePath' => '/uploads/maps/managed.png'],
                );
            $service = new class extends ManagedMediaCleanupService {
                public function __construct() {}

                protected function unlinkManagedFile(string $fullPath): bool
                {
                    return false;
                }
            };
            (new \ReflectionProperty(ManagedMediaCleanupService::class, 'projectDir'))->setValue($service, $root);
            (new \ReflectionProperty(ManagedMediaCleanupService::class, 'logger'))->setValue($service, $logger);

            $service->cleanupMapImageAfterDeletion('/uploads/maps/managed.png');

            self::assertFileExists($managedFile);
        } finally {
            @unlink($managedFile);
            @rmdir($uploadDirectory);
            @rmdir(dirname($uploadDirectory));
            @rmdir(dirname(dirname($uploadDirectory)));
            @rmdir($root);
        }
    }
}
