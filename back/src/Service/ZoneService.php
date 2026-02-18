<?php
// back/src/Service/ZoneService.php

namespace App\Service;

use App\Entity\Location;
use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Repository\LocationRepository;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use Doctrine\ORM\EntityManagerInterface;

class ZoneService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ZoneRepository $zoneRepo,
        private MapRepository $mapRepo,
        private LocationRepository $locationRepo,
    ) {}

   public function listByMap(int $mapId): array
{
    $map = $this->mapRepo->find($mapId);
    if (!$map instanceof Map) {
        throw new \RuntimeException('Map not found');
    }

    $zones = $this->zoneRepo->findBy(['map' => $map], ['id' => 'DESC']);

    // ✅ ne renvoie pas les zones dont la location est dans la corbeille
    $zones = array_values(array_filter($zones, function(Zone $z) {
        $loc = $z->getLocation();
        if (!$loc) return true;          // zone sans location => on la garde (ou tu peux décider de la cacher aussi)
        return !$loc->isDeleted();       // si location deleted => on cache la zone
    }));

    return array_map(fn(Zone $z) => $this->toArray($z), $zones);
}


    /** @return array<string,mixed> */
    public function create(array $data): array
    {
        $mapId = $data['mapId'] ?? $data['map_id'] ?? null;
        if (!is_numeric($mapId)) {
            throw new \InvalidArgumentException('mapId requis');
        }

        $map = $this->mapRepo->find((int) $mapId);
        if (!$map instanceof Map) {
            throw new \RuntimeException('Map not found');
        }

        $top = $this->num($data['topPercent'] ?? $data['top_percent'] ?? null, 'topPercent');
        $left = $this->num($data['leftPercent'] ?? $data['left_percent'] ?? null, 'leftPercent');
        $width = $this->num($data['widthPercent'] ?? $data['width_percent'] ?? null, 'widthPercent');
        $height = $this->num($data['heightPercent'] ?? $data['height_percent'] ?? null, 'heightPercent');

        if ($width <= 0 || $height <= 0) {
            throw new \InvalidArgumentException('widthPercent/heightPercent doivent être > 0');
        }

        $label = $data['label'] ?? null;
        $label = is_string($label) ? trim($label) : null;
        if ($label === '') $label = null;

        $zone = new Zone();
        $zone->setMap($map);
        $zone->setLabel($label);
        $zone->setTopPercent($top);
        $zone->setLeftPercent($left);
        $zone->setWidthPercent($width);
        $zone->setHeightPercent($height);
        $zone->setEnabled(true);

        // ✅ LIGNE QUI MANQUAIT : lier la zone à la location si on reçoit locationId
        $locationId = $data['locationId'] ?? $data['location_id'] ?? null;
        if (is_numeric($locationId)) {
            $loc = $this->locationRepo->find((int) $locationId);
            if ($loc instanceof Location) {
                $zone->setLocation($loc); // ✅ pas de setLocationId, c’est une relation Doctrine
            }
        }

        $this->em->persist($zone);
        $this->em->flush();

        return $this->toArray($zone);
    }

    private function num($v, string $field): float
    {
        if (!is_numeric($v)) throw new \InvalidArgumentException("$field invalide");
        return (float) $v;
    }

    /** @return array<string,mixed> */
    private function toArray(Zone $z): array
    {
        return [
            'id' => $z->getId(),
            'mapId' => $z->getMap()?->getId(),
            'code' => $z->getCode(),
            'label' => $z->getLabel(),
            'locationId' => $z->getLocation()?->getId(), // ✅ c’est ça qu’il faut renvoyer
            'topPercent' => $z->getTopPercent(),
            'leftPercent' => $z->getLeftPercent(),
            'widthPercent' => $z->getWidthPercent(),
            'heightPercent' => $z->getHeightPercent(),
            'enabled' => $z->isEnabled(),
        ];
    }
}
