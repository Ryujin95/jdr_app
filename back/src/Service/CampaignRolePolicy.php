<?php

namespace App\Service;

final class CampaignRolePolicy
{
    /** @param list<string> $allowedCampaignRoles */
    public function allows(?string $campaignRole, array $allowedCampaignRoles, bool $isGlobalAdmin): bool
    {
        return $isGlobalAdmin
            || ($campaignRole !== null && in_array($campaignRole, $allowedCampaignRoles, true));
    }

    public function canEditCharacter(?string $campaignRole, bool $isGlobalAdmin, bool $ownsPlayerCharacter): bool
    {
        return $isGlobalAdmin
            || $campaignRole === 'MJ'
            || ($campaignRole === 'Player' && $ownsPlayerCharacter);
    }

    public function canLeaveCampaign(?string $campaignRole): bool
    {
        return $campaignRole === 'Player';
    }

    public function canTransferMj(?string $currentRole, ?string $targetRole, bool $targetIsMember): bool
    {
        return $currentRole === 'MJ' && $targetIsMember && $targetRole === 'Player';
    }
}
