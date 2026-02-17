<?php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Entity\User;
use App\Repository\LocationRepository;
use App\Repository\Map\MapRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class LocationService
{
    public function __construct(
        private LocationRepository $locationRepository,
        private EntityManagerInterface $em,
        private Security $security,
        private MapRepository $mapRepository,
    ) {}

    public function getLocationsForCurrentUser(?int $campaignId): array
    {
        /** @var User|null $user */
        $user = $this->security->getUser();
        if (!$user) {
            return [];
        }

        if (!$campaignId) {
            throw new \InvalidArgumentException('campaignId requis');
        }

        $locations = $this->locationRepository->findActiveByCampaignId($campaignId);

        $data = [];
        foreach ($locations as $location) {
            $data[] = [
                'id'          => $location->getId(),
                'name'        => $location->getName(),
                'description' => $location->getDescription(),
                'campaignId'  => $location->getCampaign()?->getId(),
            ];
        }

        return $data;
    }

    public function createLocation(array $data): array
    {
        $name = trim($data['name'] ?? '');
        $description = array_key_exists('description', $data) ? trim((string) $data['description']) : null;
        $description = ($description === '') ? null : $description;

        $campaignIdRaw = $data['campaignId'] ?? $data['campaign_id'] ?? null;
        $campaignId = is_numeric($campaignIdRaw) ? (int) $campaignIdRaw : null;

        if ($name === '') {
            throw new \InvalidArgumentException('Le nom du lieu est obligatoire.');
        }

        if (!$campaignId || $campaignId <= 0) {
            throw new \InvalidArgumentException('campaignId est obligatoire.');
        }

        $campaign = $this->em->getRepository(Campaign::class)->find($campaignId);
        if (!$campaign instanceof Campaign) {
            throw new \InvalidArgumentException('Campagne introuvable.');
        }

        $location = new Location();
        $location->setName($name);
        $location->setDescription($description);
        $location->setDeleted(false);
        $location->setCampaign($campaign);

        $this->em->persist($location);

        // ✅ Zone par défaut liée à la map de la campagne (si elle existe)
        $map = $this->mapRepository->findOneBy(['campaign' => $campaign], ['id' => 'DESC']);
        if ($map instanceof Map) {
            $zone = new Zone();
            $zone->setMap($map);

            // code obligatoire (non nullable dans ton entity)
            $zone->setCode($this->makeZoneCode($name));

            // label optionnel dans la DB, mais par défaut on met le nom du lieu
            $zone->setLabel($name);

            // lien Doctrine vers Location (il faut que Zone ait getLocation/setLocation)
            if (method_exists($zone, 'setLocation')) {
                $zone->setLocation($location);
            } else {
                // Si tu n'as pas encore la relation Zone->Location,
                // on ne casse pas la création du lieu: on skip juste la liaison.
                // (Dis-moi et je te corrige Zone.php)
            }

            // rectangle par défaut "standard"
            $zone->setTopPercent(10.0);
            $zone->setLeftPercent(10.0);
            $zone->setWidthPercent(18.0);
            $zone->setHeightPercent(14.0);
            $zone->setEnabled(true);

            $this->em->persist($zone);
        }

        $this->em->flush();

        return [
            'id' => $location->getId(),
            'name' => $location->getName(),
            'description' => $location->getDescription(),
            'deleted' => $location->isDeleted(),
            'campaignId' => $location->getCampaign()?->getId(),
        ];
    }

    private function makeZoneCode(string $label): string
    {
        $base = mb_strtolower(trim($label));
        $base = preg_replace('/[^a-z0-9]+/u', '-', $base) ?? 'zone';
        $base = trim($base, '-');
        if ($base === '') $base = 'zone';

        return $base . '-' . bin2hex(random_bytes(4));
    }
}
