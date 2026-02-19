<?php

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

    public function listByMap(int $mapId): array
    {
        $map = $this->mapRepo->find($mapId);
        if (!$map instanceof Map) {
            throw new \RuntimeException('Map not found');
        }

        $zones = $this->zoneRepo->findBy(['map' => $map], ['id' => 'DESC']);
        return array_map(fn(Zone $z) => $this->toArray($z), $zones);
    }

    public function create(array $data): array
    {
        $mapId = $data['mapId'] ?? null;
        if (!is_numeric($mapId)) {
            throw new \InvalidArgumentException('mapId requis');
        }

        $map = $this->mapRepo->find((int) $mapId);
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

    public function update(int $zoneId, array $data): array
    {
        $zone = $this->zoneRepo->find($zoneId);
        if (!$zone instanceof Zone) {
            throw new \RuntimeException('Zone not found');
        }

        $top = $this->optNum($data, ['topPercent', 'top_percent']);
        $left = $this->optNum($data, ['leftPercent', 'left_percent']);
        $width = $this->optNum($data, ['widthPercent', 'width_percent']);
        $height = $this->optNum($data, ['heightPercent', 'height_percent']);

        if ($top !== null) $zone->setTopPercent($this->clamp($top, 0, 100));
        if ($left !== null) $zone->setLeftPercent($this->clamp($left, 0, 100));
        if ($width !== null) $zone->setWidthPercent($this->clamp($width, 1, 100));
        if ($height !== null) $zone->setHeightPercent($this->clamp($height, 1, 100));

        if (array_key_exists('label', $data)) {
            $label = is_string($data['label']) ? trim($data['label']) : null;
            $zone->setLabel($label === '' ? null : $label);
        }

        $this->em->flush();
        return $this->toArray($zone);
    }

    private function clamp(float $v, float $min, float $max): float
    {
        return max($min, min($max, $v));
    }

    private function num($v, string $field): float
    {
        if (!is_numeric($v)) throw new \InvalidArgumentException("$field invalide");
        return (float) $v;
    }

    private function optNum(array $data, array $keys): ?float
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $data)) {
                $v = $data[$k];
                if (!is_numeric($v)) throw new \InvalidArgumentException("$k invalide");
                return (float) $v;
            }
        }
        return null;
    }

    private function toArray(Zone $z): array
    {
        $characters = [];

        $loc = $z->getLocation();
        if ($loc) {
            foreach ($loc->getCharacters() as $c) {
                $characters[] = [
                    'id' => $c->getId(),
                    'nickname' => $c->getNickname(),
                    'avatarUrl' => $c->getAvatarUrl(),
                ];
            }
        }

        return [
            'id' => $z->getId(),
            'mapId' => $z->getMap()?->getId(),
            'code' => $z->getCode(),
            'label' => $z->getLabel(),
            'locationId' => $z->getLocationId(),
            'topPercent' => $z->getTopPercent(),
            'leftPercent' => $z->getLeftPercent(),
            'widthPercent' => $z->getWidthPercent(),
            'heightPercent' => $z->getHeightPercent(),
            'enabled' => $z->isEnabled(),
            'characters' => $characters,
        ];
    }
}
