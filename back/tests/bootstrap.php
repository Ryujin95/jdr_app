<?php

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

if (method_exists(Dotenv::class, 'bootEnv')) {
    (new Dotenv())->bootEnv(dirname(__DIR__).'/.env');
}

require_once __DIR__.'/Support/TestEnvironmentGuard.php';

App\Tests\Support\TestEnvironmentGuard::assertSafe(
    array_merge($_ENV, $_SERVER),
    dirname(__DIR__),
);

if ($_SERVER['APP_DEBUG']) {
    umask(0000);
}
