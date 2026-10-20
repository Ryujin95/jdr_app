<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CorsOriginTest extends WebTestCase
{
    public function testPreflightAllowsAConfiguredDevelopmentOrigin(): void
    {
        $client = static::createClient();
        $client->request('OPTIONS', '/api/login_check', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        self::assertResponseHeaderSame('Access-Control-Allow-Origin', 'http://localhost:5173');
    }

    public function testPreflightDoesNotAllowAnUnconfiguredOrigin(): void
    {
        $client = static::createClient();
        $client->request('OPTIONS', '/api/login_check', server: [
            'HTTP_ORIGIN' => 'https://untrusted.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        self::assertResponseHasNoHeader('Access-Control-Allow-Origin');
    }
}
