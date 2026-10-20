<?php

declare(strict_types=1);

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\User;
use App\Tests\Support\FixtureFactory;
use App\Tests\Support\TestEnvironmentGuard;
use Symfony\Component\Dotenv\Dotenv;

$projectDir = dirname(__DIR__);
require $projectDir.'/vendor/autoload.php';

$_SERVER['APP_ENV'] = 'test';
$_ENV['APP_ENV'] = 'test';
(new Dotenv())->bootEnv($projectDir.'/.env');

$environment = array_merge($_ENV, $_SERVER);
TestEnvironmentGuard::assertSafe($environment, $projectDir);

foreach ([
    ['DATABASE_URL', 'mysql://localhost/jdr_app'],
    ['MAILER_DSN', 'smtp://localhost'],
    ['APP_STORAGE_DIR', $projectDir.'/public'],
] as [$name, $value]) {
    $unsafeEnvironment = $environment;
    $unsafeEnvironment[$name] = $value;

    try {
        TestEnvironmentGuard::assertSafe($unsafeEnvironment, $projectDir);
    } catch (RuntimeException) {
        continue;
    }

    throw new RuntimeException(sprintf('Isolation guard accepted an unsafe %s override.', $name));
}

if (
    !FixtureFactory::user() instanceof User
    || !FixtureFactory::campaign() instanceof Campaign
    || !FixtureFactory::character() instanceof Character
) {
    throw new RuntimeException('FixtureFactory did not create the expected unsaved entities.');
}

$scenario = FixtureFactory::authorizationScenario();
if (
    count($scenario['campaigns']) !== 2
    || count($scenario['users']) !== 6
    || count($scenario['memberships']) !== 6
    || count($scenario['characters']) !== 4
    || $scenario['users']['admin']->getRoles()[0] !== 'ROLE_ADMIN'
    || $scenario['campaigns']['beta'] !== $scenario['memberships'][3]->getCampaign()
    || $scenario['maps']['alpha'] !== $scenario['zones']['alpha']->getMap()
    || $scenario['characters']['alpha_player'] !== $scenario['positions'][0]->getCharacter()
) {
    throw new RuntimeException('Authorization fixture graph is incomplete or incorrectly linked.');
}

$privateKey = openssl_pkey_get_private(file_get_contents($projectDir.'/tests/Fixtures/jwt/private.pem'));
$publicKey = openssl_pkey_get_public(file_get_contents($projectDir.'/tests/Fixtures/jwt/public.pem'));
if (!$privateKey || !$publicKey) {
    throw new RuntimeException('Dedicated test JWT keys are invalid.');
}

$storageDir = $projectDir.'/var/test';
if (!is_dir($storageDir) && !mkdir($storageDir, 0700, true) && !is_dir($storageDir)) {
    throw new RuntimeException('Could not create the isolated test storage directory.');
}

$temporaryFile = tempnam($storageDir, 'isolation-');
if ($temporaryFile === false) {
    throw new RuntimeException('Could not create a test-only temporary file.');
}

try {
    $resolvedFile = realpath($temporaryFile);
    $resolvedStorage = realpath($storageDir);
    $resolvedPublic = realpath($projectDir.'/public') ?: $projectDir.'/public';

    if (
        $resolvedFile === false
        || $resolvedStorage === false
        || !str_starts_with($resolvedFile, $resolvedStorage.DIRECTORY_SEPARATOR)
        || str_starts_with($resolvedFile, $resolvedPublic.DIRECTORY_SEPARATOR)
    ) {
        throw new RuntimeException('A temporary test file escaped the isolated storage directory.');
    }
} finally {
    if (is_file($temporaryFile)) {
        unlink($temporaryFile);
    }
}

echo "Test isolation checks passed (no database connection opened).\n";
