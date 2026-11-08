<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Service\ResetPasswordEmailSender;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final class ResetPasswordEmailSenderTest extends TestCase
{
    public function testProductionSendsTheExistingEmailContentThroughBrevoHttpApi(): void
    {
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::never())->method('send');
        $httpClient = new MockHttpClient(static function (string $method, string $url, array $options): MockResponse {
            self::assertSame('POST', $method);
            self::assertSame('https://api.brevo.com/v3/smtp/email', $url);
            self::assertContains('api-key: test-api-key', array_map('strtolower', $options['headers']));
            self::assertSame([
                'sender' => ['email' => 'no-reply@example.test', 'name' => 'StoryForge'],
                'to' => [['email' => 'player@example.test']],
                'subject' => 'Réinitialisation de mot de passe',
                'textContent' => 'existing reset message',
            ], json_decode($options['body'], true, 512, JSON_THROW_ON_ERROR));

            return new MockResponse('{"messageId":"test-message"}', ['http_code' => 201]);
        });

        $sender = new ResetPasswordEmailSender($mailer, $httpClient, 'test-api-key', 'prod');
        $sender->send($this->resetEmail());
    }

    public function testNonProductionKeepsUsingTheConfiguredSymfonyMailer(): void
    {
        $email = $this->resetEmail();
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::once())->method('send')->with($email);
        $httpClient = new MockHttpClient(static function (): never {
            self::fail('Non-production must keep using the existing mail transport.');
        });

        (new ResetPasswordEmailSender($mailer, $httpClient, '', 'dev'))->send($email);
    }

    public function testProductionFailsClearlyWhenBrevoApiKeyIsMissing(): void
    {
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects(self::never())->method('send');
        $httpClient = new MockHttpClient(static function (): never {
            self::fail('No HTTP request should be sent without a configured API key.');
        });

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('BREVO_API_KEY must be configured in production.');
        (new ResetPasswordEmailSender($mailer, $httpClient, '', 'prod'))->send($this->resetEmail());
    }

    public function testBrevoHttpFailureIsNotReportedAsSuccessfulDelivery(): void
    {
        $mailer = $this->createStub(MailerInterface::class);
        $httpClient = new MockHttpClient(static fn (): MockResponse => new MockResponse('', ['http_code' => 401]));

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Brevo transactional email request failed with HTTP 401.');
        (new ResetPasswordEmailSender($mailer, $httpClient, 'test-api-key', 'prod'))->send($this->resetEmail());
    }

    private function resetEmail(): Email
    {
        return (new Email())
            ->from('StoryForge <no-reply@example.test>')
            ->to('player@example.test')
            ->subject('Réinitialisation de mot de passe')
            ->text('existing reset message');
    }
}
