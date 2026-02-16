<?php
// back/src/Service/ZoneService.php

namespace App\Service;

use App\Entity\Map\Map;
use App\Entity\Map\Zone;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use Doctrine\ORM\EntityManagerInterface;

class ZoneService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ZoneRepository $zoneRepo,
        private MapRepository $mapRepo,
    ) {}

    /** @return array<int, array<string,mixed>> */
    public function listByMap(int $mapId): array
    {
        $map = $this->mapRepo->find($mapId);
        if (!$map instanceof Map) {
            throw new \RuntimeException('Map not found');
        }

        $zones = $this->zoneRepo->findBy(['map' => $map], ['id' => 'DESC']);
        return array_map(fn(Zone $z) => $this->toArray($z), $zones);
    }

    /** @return array<string,mixed> */
    public function create(array $data): array
    {
        $mapId = $data['mapId'] ?? null;
        if (!is_numeric($mapId)) {
            throw new \InvalidArgumentException('mapId requis');
        }

        $map = $this->mapRepo->find((int)$mapId);
        if (!$map instanceof Map) {
            throw new \RuntimeException('Map not found');
        }

        $top = $this->num($data['topPercent'] ?? null, 'topPercent');
        $left = $this->num($data['leftPercent'] ?? null, 'leftPercent');
        $width = $this->num($data['widthPercent'] ?? null, 'widthPercent');
        $height = $this->num($data['heightPercent'] ?? null, 'heightPercent');

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

        $this->em->persist($zone);
        $this->em->flush();

        return $this->toArray($zone);
    }

    private function num($v, string $field): float
    {
        if (!is_numeric($v)) throw new \InvalidArgumentException("$field invalide");
        return (float)$v;
    }

    /** @return array<string,mixed> */
    private function toArray(Zone $z): array
    {
        return [
            'id' => $z->getId(),
            'mapId' => $z->getMap()?->getId(),
            'label' => $z->getLabel(),
            'topPercent' => $z->getTopPercent(),
            'leftPercent' => $z->getLeftPercent(),
            'widthPercent' => $z->getWidthPercent(),
            'heightPercent' => $z->getHeightPercent(),
            'enabled' => $z->isEnabled(),
        ];
    }
}
