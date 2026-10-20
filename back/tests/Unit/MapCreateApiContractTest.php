<?php

namespace App\Tests\Unit;

use App\Controller\Api\MapController;
use App\Entity\Map\Map;
use App\Entity\User;
use App\Service\MapService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

final class MapCreateApiContractTest extends TestCase
{
    public function testCreateForwardsMultipartFieldsAndImageAndReturnsCreatedMap(): void
    {
        $imagePath = tempnam(sys_get_temp_dir(), 'storyforge-map-upload-');
        self::assertNotFalse($imagePath);
        file_put_contents($imagePath, 'test image');

        try {
            $image = new UploadedFile($imagePath, 'campaign.png', 'image/png', null, true);
            $request = new Request(
                ['campaignId' => '7', 'name' => 'North map'],
                [],
                [],
                [],
                ['image' => $image],
                ['REQUEST_METHOD' => 'POST'],
            );

            $map = $this->createMock(Map::class);
            $service = $this->createMock(MapService::class);
            $service->expects(self::once())
                ->method('createFromRequest')
                ->with(self::isInstanceOf(User::class), self::callback(function (Request $actual) use ($image): bool {
                    return $actual->request->get('campaignId') === '7'
                        && $actual->request->get('name') === 'North map'
                        && $actual->files->get('image') === $image;
                }))
                ->willReturn($map);
            $service->expects(self::once())
                ->method('toArray')
                ->with($map)
                ->willReturn(['id' => 12, 'campaignId' => 7, 'name' => 'North map']);

            $controller = new MapController($service);
            $this->configureAuthenticatedController($controller);
            $response = $controller->create($request);

            self::assertSame(201, $response->getStatusCode());
            self::assertSame(
                ['id' => 12, 'campaignId' => 7, 'name' => 'North map'],
                json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR),
            );
        } finally {
            @unlink($imagePath);
        }
    }

    public function testInvalidMultipartInputReturnsValidationError(): void
    {
        $service = $this->createMock(MapService::class);
        $service->expects(self::once())
            ->method('createFromRequest')
            ->willThrowException(new \InvalidArgumentException('Image requise'));

        $controller = new MapController($service);
        $this->configureAuthenticatedController($controller);
        $response = $controller->create(new Request(['campaignId' => '7', 'name' => 'North map']));

        self::assertSame(400, $response->getStatusCode());
        self::assertSame(['message' => 'Image requise'], json_decode($response->getContent(), true));
    }

    public function testCampaignAccessDenialIsReturnedAsForbidden(): void
    {
        $service = $this->createMock(MapService::class);
        $service->expects(self::once())
            ->method('createFromRequest')
            ->willThrowException(new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException('Forbidden'));

        $controller = new MapController($service);
        $this->configureAuthenticatedController($controller);
        $response = $controller->create(new Request(['campaignId' => '7', 'name' => 'North map']));

        self::assertSame(403, $response->getStatusCode());
    }

    private function configureAuthenticatedController(MapController $controller): void
    {
        $user = new User();
        $token = new UsernamePasswordToken($user, 'main', $user->getRoles());
        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);
        $container = new ContainerBuilder();
        $container->set('security.token_storage', $tokenStorage);
        $controller->setContainer($container);
    }
}
