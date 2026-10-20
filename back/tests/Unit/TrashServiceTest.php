<?php

namespace App\Tests\Unit;

use App\Entity\User;
use App\Entity\Campaign;
use App\Entity\Character;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Character\CharacterRepository;
use App\Repository\LocationRepository;
use App\Repository\Map\ZoneRepository;
use App\Repository\UserRepository;
use App\Service\CampaignAuthorization;
use App\Service\CampaignRolePolicy;
use App\Service\ManagedMediaCleanupService;
use App\Service\TrashService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final class TrashServiceTest extends TestCase
{
    public function testNonAdministratorCannotLookUpOrDeleteAnAccountFromTrash(): void
    {
        $actor = $this->user(10);
        $security = $this->security($actor, false);
        $users = $this->createMock(UserRepository::class);
        $users->expects(self::never())->method('find');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('remove');
        $entityManager->expects(self::never())->method('flush');
        $entityManager->expects(self::never())->method('wrapInTransaction');

        $service = $this->service($users, $security, $entityManager);

        $this->expectException(AccessDeniedHttpException::class);
        $service->forceDelete('user', 77, null, $actor);
    }

    public function testAdministratorCannotPermanentlyDeleteAnActiveAccount(): void
    {
        $actor = $this->user(10);
        $activeAccount = $this->user(77);
        $users = $this->createMock(UserRepository::class);
        $users->expects(self::once())->method('find')->with(77)->willReturn($activeAccount);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('remove');
        $entityManager->expects(self::never())->method('flush');
        $entityManager->expects(self::never())->method('wrapInTransaction');

        $service = $this->service($users, $this->security($actor, true), $entityManager);

        $this->expectException(ConflictHttpException::class);
        $service->forceDelete('user', 77, null, $actor);
    }

    public function testAdministratorCanPermanentlyDeleteAnAccountAlreadyInTrash(): void
    {
        $actor = $this->user(10);
        $deletedAccount = $this->user(77);
        $deletedAccount->setDeleted(true);
        $users = $this->createMock(UserRepository::class);
        $users->expects(self::once())->method('find')->with(77)->willReturn($deletedAccount);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove')->with($deletedAccount);
        $entityManager->expects(self::once())
            ->method('wrapInTransaction')
            ->willReturnCallback(static function (callable $operation) use ($entityManager): void {
                $operation($entityManager);
            });

        $service = $this->service($users, $this->security($actor, true), $entityManager);
        $service->forceDelete('user', 77, null, $actor);

        self::assertTrue($deletedAccount->isDeleted());
    }

    public function testRestoreRejectsASecondActivePlayerCharacterInTheSameCampaign(): void
    {
        $actor = $this->user(10);
        $owner = $this->user(20);
        $campaign = (new Campaign())->setTitle('Campaign');
        (new \ReflectionProperty(Campaign::class, 'id'))->setValue($campaign, 17);
        $deletedCharacter = (new Character())
            ->setIsPlayer(true)
            ->setDeleted(true)
            ->setOwner($owner)
            ->setCampaign($campaign);
        $activeCharacter = (new Character())->setIsPlayer(true)->setCampaign($campaign);

        $characters = $this->createMock(CharacterRepository::class);
        $characters->expects(self::once())->method('find')->with(77)->willReturn($deletedCharacter);
        $characters->expects(self::once())
            ->method('findActivePlayerCharacterByOwnerInCampaign')
            ->with($owner, 17)
            ->willReturn($activeCharacter);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('wrapInTransaction');

        $service = $this->service(
            $this->createMock(UserRepository::class),
            $this->security($actor, true),
            $entityManager,
            $characters,
        );

        $this->expectException(ConflictHttpException::class);
        $service->restore('character', 77, 17, $actor);
    }

    private function service(
        UserRepository $users,
        Security $security,
        EntityManagerInterface $entityManager,
        ?CharacterRepository $characters = null,
    ): TrashService
    {
        $authorization = new CampaignAuthorization(
            $security,
            $this->createMock(CampaignRepository::class),
            (new \ReflectionClass(CampaignMemberRepository::class))->newInstanceWithoutConstructor(),
            new CampaignRolePolicy(),
        );

        return new TrashService(
            $users,
            $characters ?? $this->createMock(CharacterRepository::class),
            $this->createMock(LocationRepository::class),
            $this->createMock(ZoneRepository::class),
            $entityManager,
            $security,
            $authorization,
            $this->createMock(ManagedMediaCleanupService::class),
        );
    }

    private function security(User $actor, bool $isAdmin): Security
    {
        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($actor);
        $security->method('isGranted')->willReturnCallback(
            static fn(string $role): bool => $role === 'ROLE_ADMIN' && $isAdmin
        );

        return $security;
    }

    private function user(int $id): User
    {
        $user = new User();
        $idProperty = new \ReflectionProperty(User::class, 'id');
        $idProperty->setValue($user, $id);

        return $user;
    }
}
