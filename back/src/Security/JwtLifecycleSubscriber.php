<?php

namespace App\Security;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class JwtLifecycleSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly JwtPasswordStamp $passwordStamp)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [Events::JWT_CREATED => 'onJwtCreated'];
    }

    public function onJwtCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        $payload = $event->getData();
        $payload[JwtPasswordStamp::CLAIM] = $this->passwordStamp->forUser($user);
        $event->setData($payload);
    }
}
