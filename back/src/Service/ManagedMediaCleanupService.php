<?php

namespace App\Service;

use Psr\Log\LoggerInterface;

class ManagedMediaCleanupService
{
    public function __construct(
        private string $projectDir,
        private LoggerInterface $logger,
    ) {}

    /** Call only after the database transaction deleting the owning entity has committed. */
    public function cleanupMapImageAfterDeletion(string $imagePath): void
    {
        $this->removeManagedFile($imagePath, '/uploads/maps/', 'public/uploads/maps');
    }

    /** Call only after the database transaction deleting the owning entity has committed. */
    public function cleanupAvatarAfterDeletion(string $imagePath): void
    {
        $this->removeManagedFile($imagePath, '/image/', 'public/image');
    }

    private function removeManagedFile(string $imagePath, string $urlPrefix, string $relativeDirectory): void
    {
        if (!str_starts_with($imagePath, $urlPrefix)) {
            return;
        }

        $filename = substr($imagePath, strlen($urlPrefix));
        if ($filename === '' || basename($filename) !== $filename) {
            return;
        }

        $directory = rtrim(
            $this->projectDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeDirectory),
            DIRECTORY_SEPARATOR,
        );
        $fullPath = $directory . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($fullPath)) {
            return;
        }

        if (!$this->unlinkManagedFile($fullPath)) {
            $this->logger->error('Entity was deleted from the database, but its public image cleanup failed.', [
                'imagePath' => $imagePath,
            ]);
        }
    }

    protected function unlinkManagedFile(string $fullPath): bool
    {
        return @unlink($fullPath);
    }
}
