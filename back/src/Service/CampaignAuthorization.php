<?php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\Character;
use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Entity\User;
use App\Repository\Campaign\CampaignMemberRepository;
use App\Repository\Campaign\CampaignRepository;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Campaign-scoped authorization. ROLE_MJ is never treated as a campaign role. */
final class CampaignAuthorization
{
    public function __construct(
        private Security $security,
        private CampaignRepository $campaignRepository,
        private CampaignMemberRepository $memberRepository,
        private CampaignRolePolicy $rolePolicy,
    ) {}

    /** @param list<string> $allowedCampaignRoles */
    public function assertCampaignRole(int $campaignId, array $allowedCampaignRoles): Campaign
    {
        $campaign = $this->campaignRepository->find($campaignId);
        if (!$campaign instanceof Campaign) {
            throw new NotFoundHttpException('Campagne introuvable.');
        }

        $this->assertRoleForCampaign($campaign, $allowedCampaignRoles);
        return $campaign;
    }

    /** Check a campaign role for a related user, without applying the current admin exception. */
    public function assertUserCampaignRole(User $user, int $campaignId, array $allowedCampaignRoles): Campaign
    {
        $campaign = $this->campaignRepository->find($campaignId);
        if (!$campaign instanceof Campaign) {
            throw new NotFoundHttpException('Campagne introuvable.');
        }

        $role = $this->memberRepository->getRoleForUserInCampaign($campaignId, (int) $user->getId());
        if (!$this->rolePolicy->allows($role, $allowedCampaignRoles, false)) {
            throw new AccessDeniedHttpException('Cet utilisateur n’est pas autorisé dans cette campagne.');
        }

        return $campaign;
    }

    /** @param list<string> $allowedCampaignRoles */
    public function assertResourceRole(object $resource, array $allowedCampaignRoles): Campaign
    {
        $campaign = $this->resolveCampaignForResource($resource);
        $this->assertRoleForCampaign($campaign, $allowedCampaignRoles);
        return $campaign;
    }

    public function assertCharacterEditor(Character $character): Campaign
    {
        $campaign = $this->resolveCampaignForResource($character);
        $isGlobalAdmin = $this->security->isGranted('ROLE_ADMIN');
        $user = $this->currentUser();
        $role = $this->memberRepository->getRoleForUserInCampaign(
            (int) $campaign->getId(),
            (int) $user->getId()
        );
        $owner = $character->getOwner();
        $ownsPlayerCharacter = $character->isPlayer()
            && $owner instanceof User
            && $owner->getId() === $user->getId();

        if (!$this->rolePolicy->canEditCharacter($role, $isGlobalAdmin, $ownsPlayerCharacter)) {
            throw new AccessDeniedHttpException('Seul le MJ de la campagne ou le propriétaire du personnage peut le modifier.');
        }

        return $campaign;
    }

    /** Check a client-supplied campaign ID against the resource's stored relation. */
    public function assertResourceBelongsToCampaign(object $resource, int $campaignId): Campaign
    {
        $campaign = $this->resolveCampaignForResource($resource);
        if ($campaign->getId() !== $campaignId) {
            throw new AccessDeniedHttpException('La ressource ne correspond pas à cette campagne.');
        }

        return $campaign;
    }

    /** @param list<string> $allowedCampaignRoles */
    public function hasCampaignRole(int $campaignId, array $allowedCampaignRoles): bool
    {
        $campaign = $this->campaignRepository->find($campaignId);
        if (!$campaign instanceof Campaign) {
            throw new NotFoundHttpException('Campagne introuvable.');
        }

        $isGlobalAdmin = $this->security->isGranted('ROLE_ADMIN');
        if ($isGlobalAdmin && $this->rolePolicy->allows(null, $allowedCampaignRoles, true)) {
            return true;
        }

        $user = $this->currentUser();
        $role = $this->memberRepository->getRoleForUserInCampaign($campaignId, (int) $user->getId());
        return $this->rolePolicy->allows($role, $allowedCampaignRoles, $isGlobalAdmin);
    }

    private function assertRoleForCampaign(Campaign $campaign, array $allowedCampaignRoles): void
    {
        $isGlobalAdmin = $this->security->isGranted('ROLE_ADMIN');
        if ($isGlobalAdmin && $this->rolePolicy->allows(null, $allowedCampaignRoles, true)) {
            return;
        }

        $user = $this->currentUser();
        $role = $this->memberRepository->getRoleForUserInCampaign(
            (int) $campaign->getId(),
            (int) $user->getId()
        );

        if (!$this->rolePolicy->allows($role, $allowedCampaignRoles, $isGlobalAdmin)) {
            throw new AccessDeniedHttpException('Accès refusé pour cette campagne.');
        }
    }

    private function currentUser(): User
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedHttpException('Authentification requise.');
        }

        return $user;
    }

    public function resolveCampaignForResource(object $resource): Campaign
    {
        if ($resource instanceof Character) {
            $campaign = $resource->getCampaign();
            $location = $resource->getLocation();
            if ($location !== null) {
                $this->assertSameCampaign($campaign, $location->getCampaign());
            }
        } elseif ($resource instanceof Location || $resource instanceof Map) {
            $campaign = $resource->getCampaign();
        } elseif ($resource instanceof Zone) {
            $map = $resource->getMap();
            $campaign = $map?->getCampaign();
            if ($resource->getLocation() !== null) {
                $this->assertSameCampaign($campaign, $resource->getLocation()->getCampaign());
            }
        } else {
            throw new AccessDeniedHttpException('Contexte de campagne indisponible.');
        }

        if (!$campaign instanceof Campaign || $campaign->getId() === null) {
            throw new AccessDeniedHttpException('La ressource n’est rattachée à aucune campagne.');
        }

        return $campaign;
    }

    private function assertSameCampaign(?Campaign $left, ?Campaign $right): void
    {
        if (!$left instanceof Campaign || !$right instanceof Campaign
            || $left->getId() === null || $left->getId() !== $right->getId()) {
            throw new AccessDeniedHttpException('Les ressources ne sont pas cohérentes avec la même campagne.');
        }
    }
}
