<?php

namespace App\Service;

/** Pure decision for reading one of a character's hidden fields. */
final class CharacterKnowledgeVisibilityPolicy
{
    public function allows(
        bool $hasValidCampaignContext,
        bool $isGlobalAdmin,
        bool $isCampaignMember,
        bool $isCampaignMj,
        bool $ownsPlayerCharacter,
        bool $hasExplicitGrant,
    ): bool {
        if (!$hasValidCampaignContext) {
            return false;
        }

        if ($isGlobalAdmin) {
            return true;
        }

        return $isCampaignMember
            && ($isCampaignMj || $ownsPlayerCharacter || $hasExplicitGrant);
    }
}
