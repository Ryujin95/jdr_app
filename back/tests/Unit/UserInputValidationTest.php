<?php

namespace App\Tests\Unit;

use App\Entity\User;
use App\Controller\Api\CharacterController;
use App\Repository\Character\CharacterRepository;
use App\Service\MeService;
use App\Service\UserInputValidator;
use App\Service\UserService;
use App\Service\ResetPasswordTokenService;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ObjectRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validation;
use App\Service\CharacterService;
use Psr\Log\LoggerInterface;

final class UserInputValidationTest extends TestCase
{
    public function testPasswordPolicyValidatesPlainPasswordStrength(): void
    {
        $input = $this->inputValidator();

        self::assertSame('Valid-Pass9', $input->password('Valid-Pass9'));
        try {
            $input->password('abcdefgh');
            self::fail('Weak password should be rejected.');
        } catch (UnprocessableEntityHttpException $exception) {
            self::assertStringContainsString('majuscule', $exception->getMessage());
        }
    }

    public function testInvalidEmailTypeIsRejectedAsValidationError(): void
    {
        $this->expectException(UnprocessableEntityHttpException::class);
        $this->inputValidator()->email(['not-an-email']);
    }

    public function testInvalidRegistrationDoesNotHashOrPersist(): void
    {
        $repository = $this->createMock(UserRepository::class);
        $repository->expects(self::never())->method('findOneBy');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');
        $entityManager->expects(self::never())->method('flush');
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::never())->method('hashPassword');

        $service = new UserService($repository, $entityManager, $hasher, $this->inputValidator());

        try {
            $service->create([
                'email' => 'new@example.test',
                'username' => 'NewUser',
                'password' => 'weak',
            ]);
            self::fail('Weak password should be rejected before persistence.');
        } catch (UnprocessableEntityHttpException) {
            self::assertTrue(true);
        }
    }

    public function testExistingIdentityIsReportedAsConflictBeforeMutation(): void
    {
        $existing = new User();
        (new \ReflectionProperty(User::class, 'id'))->setValue($existing, 20);
        $repository = $this->createMock(UserRepository::class);
        $repository->expects(self::once())->method('findOneBy')->with(['email' => 'taken@example.test'])->willReturn($existing);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::never())->method('hashPassword');

        $service = new UserService($repository, $entityManager, $hasher, $this->inputValidator());

        $this->expectException(ConflictHttpException::class);
        $service->create([
            'email' => 'Taken@example.test',
            'username' => 'NewUser',
            'password' => 'Valid-Pass9',
        ]);
    }

    public function testMalformedProfileJsonIsRejectedWithoutChangingTheUser(): void
    {
        $service = (new \ReflectionClass(MeService::class))->newInstanceWithoutConstructor();
        $user = (new User())->setUsername('Before')->setEmail('before@example.test');
        $request = Request::create('/', 'PUT', server: ['CONTENT_TYPE' => 'application/json'], content: '{broken');

        try {
            $service->updateFromRequest($user, $request);
            self::fail('Malformed JSON should be rejected.');
        } catch (BadRequestHttpException $exception) {
            self::assertSame('Before', $user->getUsername());
            self::assertSame('before@example.test', $user->getEmail());
        }
    }

    public function testWeakProfilePasswordIsRejectedBeforeAnyMutation(): void
    {
        $service = (new \ReflectionClass(MeService::class))->newInstanceWithoutConstructor();
        (new \ReflectionProperty(MeService::class, 'inputValidator'))->setValue($service, $this->inputValidator());
        $user = (new User())->setUsername('Before')->setEmail('before@example.test')->setPassword('old-hash');
        $request = Request::create(
            '/',
            'PUT',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['password' => 'weak'], JSON_THROW_ON_ERROR),
        );

        try {
            $service->updateFromRequest($user, $request);
            self::fail('Weak password should be rejected before hashing or changing the user.');
        } catch (UnprocessableEntityHttpException) {
            self::assertSame('Before', $user->getUsername());
            self::assertSame('before@example.test', $user->getEmail());
            self::assertSame('old-hash', $user->getPassword());
        }
    }

    public function testWeakResetPasswordIsRejectedBeforeHashingOrConsumingToken(): void
    {
        $user = (new User())
            ->setPassword('old-hash')
            ->setResetPasswordToken('reset-token')
            ->setResetPasswordTokenExpiresAt(new \DateTimeImmutable('+10 minutes'));
        $repository = $this->createMock(ObjectRepository::class);
        $repository->method('findOneBy')->willReturn($user);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('getRepository')->with(User::class)->willReturn($repository);
        $entityManager->expects(self::never())->method('flush');
        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects(self::never())->method('hashPassword');
        $service = (new \ReflectionClass(ResetPasswordTokenService::class))->newInstanceWithoutConstructor();
        (new \ReflectionProperty(ResetPasswordTokenService::class, 'em'))->setValue($service, $entityManager);
        (new \ReflectionProperty(ResetPasswordTokenService::class, 'passwordHasher'))->setValue($service, $hasher);
        (new \ReflectionProperty(ResetPasswordTokenService::class, 'inputValidator'))->setValue($service, $this->inputValidator());

        try {
            $service->resetPassword('reset-token', 'weak');
            self::fail('Weak reset password should be rejected.');
        } catch (UnprocessableEntityHttpException) {
            self::assertSame('old-hash', $user->getPassword());
            self::assertSame('reset-token', $user->getResetPasswordToken());
        }
    }

    public function testUnexpectedCharacterFailureIsLoggedWithoutExceptionMessageInResponse(): void
    {
        $characterService = $this->createMock(CharacterService::class);
        $characterService->method('getCharacterCardsForCurrentUser')
            ->willThrowException(new \RuntimeException('SQL text containing secret-password'));
        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects(self::once())->method('error')->with(
            'Unexpected character API failure.',
            self::callback(static function (array $context): bool {
                return isset($context['exception_class'], $context['exception_file'], $context['exception_line'])
                    && !str_contains(json_encode($context), 'secret-password');
            }),
        );
        $controller = new CharacterController($characterService, $this->createMock(CharacterRepository::class), $logger);

        $response = $controller->index(new Request());
        $body = json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR);

        self::assertSame(500, $response->getStatusCode());
        self::assertSame('Erreur serveur.', $body['message']);
        self::assertSame('server_error', $body['code']);
        self::assertArrayHasKey('errorId', $body);
        self::assertStringNotContainsString('secret-password', $response->getContent());
    }

    public function testInvalidCharacterCampaignIdReturnsValidationErrorBeforeCallingService(): void
    {
        $characterService = $this->createMock(CharacterService::class);
        $characterService->expects(self::never())->method('getCharacterCardsForCurrentUser');
        $controller = new CharacterController(
            $characterService,
            $this->createMock(CharacterRepository::class),
            $this->createMock(LoggerInterface::class),
        );

        $response = $controller->index(Request::create('/api/characters?campaignId=3.5'));

        self::assertSame(400, $response->getStatusCode());
        self::assertSame('validation_error', json_decode($response->getContent(), true)['code']);
    }

    private function inputValidator(): UserInputValidator
    {
        return new UserInputValidator(Validation::createValidator());
    }
}
