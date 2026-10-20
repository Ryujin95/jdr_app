<?php

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/** Defines character fields that only a campaign MJ may set. */
final class CharacterFieldPolicy
{
    private const MJ_ONLY_FIELDS = ['secret', 'isPlayer', 'ownerUserId', 'locationId'];

    /** @param list<string> $submittedFields */
    public function assertMayEdit(array $submittedFields, bool $canManage): void
    {
        if ($canManage) {
            return;
        }

        foreach (self::MJ_ONLY_FIELDS as $field) {
            if (in_array($field, $submittedFields, true)) {
                throw new AccessDeniedHttpException(
                    sprintf('Le champ "%s" est réservé au MJ de la campagne.', $field)
                );
            }
        }
    }
}
