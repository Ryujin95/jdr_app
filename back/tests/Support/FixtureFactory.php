<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Entity\Campaign;
use App\Entity\CampaignMember;
use App\Entity\Character;
use App\Entity\CharacterAttributes;
use App\Entity\CharacterKnowledge;
use App\Entity\CharacterRelationship;
use App\Entity\CharacterSkillValue;
use App\Entity\Location;
use App\Entity\Map\CharacterZonePosition;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Entity\Skill;
use App\Entity\User;

/** Creates unsaved entities for tests that do not require a database schema. */
final class FixtureFactory
{
    public static function user(string $name = 'player'): User
    {
        return (new User())
            ->setEmail($name.'@example.invalid')
            ->setUsername($name)
            ->setPassword('test-only-hash');
    }

    public static function campaign(string $title = 'Test campaign'): Campaign
    {
        return (new Campaign())->setTitle($title);
    }

    public static function character(string $nickname = 'Test character'): Character
    {
        return (new Character())
            ->setNickname($nickname)
            ->setIsPlayer(false);
    }

    /**
     * Build a fully linked, unsaved fixture graph for permission and API tests.
     *
     * @return array<string, array<object>>
     */
    public static function authorizationScenario(): array
    {
        $users = [
            'mj_alpha' => self::user('mj_alpha'),
            'cross_mj_beta' => self::user('cross_mj_beta'),
            'player_charlie' => self::user('player_charlie'),
            'player_delta' => self::user('player_delta'),
            'outsider' => self::user('outsider'),
            'admin' => self::user('admin')->setRoles(['ROLE_ADMIN']),
        ];

        $campaigns = [
            'alpha' => self::campaign('Campaign Alpha'),
            'beta' => self::campaign('Campaign Beta'),
        ];

        $memberships = [];
        $addMember = static function (string $campaignKey, string $userKey, string $role) use (&$memberships, $campaigns, $users): void {
            $member = (new CampaignMember())
                ->setUser($users[$userKey])
                ->setRole($role);
            $campaigns[$campaignKey]->addMember($member);
            $memberships[] = $member;
        };

        $addMember('alpha', 'mj_alpha', 'MJ');
        $addMember('alpha', 'cross_mj_beta', 'Player');
        $addMember('alpha', 'player_charlie', 'Player');
        $addMember('beta', 'cross_mj_beta', 'MJ');
        $addMember('beta', 'mj_alpha', 'Player');
        $addMember('beta', 'player_delta', 'Player');

        $locations = [
            'alpha' => (new Location())->setName('Alpha Keep')->setCampaign($campaigns['alpha']),
            'beta' => (new Location())->setName('Beta Harbor')->setCampaign($campaigns['beta']),
        ];

        $maps = [
            'alpha' => (new Map())->setName('Alpha Map')->setImagePath('/fixtures/alpha.png')->setCampaign($campaigns['alpha']),
            'beta' => (new Map())->setName('Beta Map')->setImagePath('/fixtures/beta.png')->setCampaign($campaigns['beta']),
        ];
        $campaigns['alpha']->setMap($maps['alpha']);
        $campaigns['beta']->setMap($maps['beta']);

        $characters = [
            'alpha_player' => self::character('Alpha Player')
                ->setIsPlayer(true)
                ->setCampaign($campaigns['alpha'])
                ->setOwner($users['cross_mj_beta'])
                ->setLocation($locations['alpha']),
            'alpha_npc' => self::character('Alpha NPC')
                ->setCampaign($campaigns['alpha'])
                ->setLocation($locations['alpha']),
            'beta_player' => self::character('Beta Player')
                ->setIsPlayer(true)
                ->setCampaign($campaigns['beta'])
                ->setOwner($users['mj_alpha'])
                ->setLocation($locations['beta']),
            'beta_second_player' => self::character('Beta Second Player')
                ->setIsPlayer(true)
                ->setCampaign($campaigns['beta'])
                ->setOwner($users['player_delta'])
                ->setLocation($locations['beta']),
        ];

        $zones = [
            'alpha' => (new Zone())->setMap($maps['alpha'])->setCode('A1')->setLocation($locations['alpha']),
            'beta' => (new Zone())->setMap($maps['beta'])->setCode('B1')->setLocation($locations['beta']),
        ];
        $positions = [
            (new CharacterZonePosition())->setZone($zones['alpha'])->setCharacter($characters['alpha_player']),
            (new CharacterZonePosition())->setZone($zones['beta'])->setCharacter($characters['beta_player']),
        ];

        $skill = (new Skill())->setName('Lore')->setParentAttribute('wits');
        $skillValues = [
            (new CharacterSkillValue())->setOwner($characters['alpha_player'])->setSkill($skill)->setLevel(2),
            (new CharacterSkillValue())->setOwner($characters['beta_player'])->setSkill($skill)->setLevel(3),
        ];

        $attributes = [
            (new CharacterAttributes())->setCharacter($characters['alpha_player'])
                ->setStrength(2)->setAgility(3)->setWits(4)->setEmpathy(1),
            (new CharacterAttributes())->setCharacter($characters['beta_player'])
                ->setStrength(3)->setAgility(2)->setWits(4)->setEmpathy(2),
        ];

        $knowledge = (new CharacterKnowledge())
            ->setViewer($users['player_charlie'])
            ->setTarget($characters['alpha_player'])
            ->setField('secret')
            ->setKnowledgelevel('full')
            ->setNotes('Fixture grant');
        $relationships = (new CharacterRelationship())
            ->setFromCharacter($characters['alpha_player'])
            ->setToCharacter($characters['alpha_npc'])
            ->setType('ally')
            ->setAffinityScore(60);

        return [
            'users' => $users,
            'campaigns' => $campaigns,
            'memberships' => $memberships,
            'characters' => $characters,
            'locations' => $locations,
            'maps' => $maps,
            'zones' => $zones,
            'positions' => $positions,
            'skills' => [$skill],
            'skill_values' => $skillValues,
            'attributes' => $attributes,
            'knowledge' => [$knowledge],
            'relationships' => [$relationships],
        ];
    }
}
