<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class ResetPasswordEmailSender
{
    private const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

    public function __construct(
        private MailerInterface $mailer,
        private HttpClientInterface $httpClient,
        private string $brevoApiKey,
        private string $environment,
    ) {}

    public function send(Email $email): void
    {
        if ($this->environment !== 'prod') {
            $this->mailer->send($email);
            return;
        }

        $apiKey = trim($this->brevoApiKey);
        if ($apiKey === '') {
            throw new \RuntimeException('BREVO_API_KEY must be configured in production.');
        }

        $from = $email->getFrom()[0] ?? throw new \LogicException('Reset email sender is missing.');
        $recipients = $email->getTo();
        if ($recipients === []) {
            throw new \LogicException('Reset email recipient is missing.');
        }

        $payload = [
            'sender' => $this->serializeAddress($from),
            'to' => array_map(fn (Address $address): array => $this->serializeAddress($address), $recipients),
            'subject' => $email->getSubject(),
            'textContent' => $email->getTextBody(),
        ];

        try {
            $response = $this->httpClient->request('POST', self::BREVO_ENDPOINT, [
                'headers' => [
                    'accept' => 'application/json',
                    'api-key' => $apiKey,
                ],
                'json' => $payload,
            ]);
            $status = $response->getStatusCode();
        } catch (TransportExceptionInterface $exception) {
            throw new \RuntimeException('Brevo transactional email request failed.', 0, $exception);
        }

        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException(sprintf('Brevo transactional email request failed with HTTP %d.', $status));
        }
    }

    /** @return array{email: string, name?: string} */
    private function serializeAddress(Address $address): array
    {
        $serialized = ['email' => $address->getAddress()];
        if ($address->getName() !== '') {
            $serialized['name'] = $address->getName();
        }

        return $serialized;
    }
}
