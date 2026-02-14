<?php
// back/src/Service/MapService.php

namespace App\Service;

use App\Entity\Map\Map;
use App\Entity\User;
use App\Repository\Map\MapRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class MapService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MapRepository $mapRepo,
        private string $projectDir, // à configurer dans services.yaml
    ) {}

    private function assertAdminOrMj(User $user): void
    {
        $roles = $user->getRoles();
        if (!in_array('ROLE_ADMIN', $roles, true) && !in_array('ROLE_MJ', $roles, true)) {
            throw new AccessDeniedException('Permission denied');
        }
    }

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user): array
    {
        $this->assertAdminOrMj($user);

        $maps = $this->mapRepo->findBy([], ['id' => 'DESC']);
        $out = [];

        foreach ($maps as $m) {
            $out[] = $this->toArray($m);
        }

        return $out;
    }

    public function get(User $user, int $id): Map
    {
        $this->assertAdminOrMj($user);

        $map = $this->mapRepo->find($id);
        if (!$map) {
            throw new \RuntimeException('Map not found');
        }

        return $map;
    }

    public function createFromRequest(User $user, Request $request): Map
    {
        $this->assertAdminOrMj($user);

        $name = trim((string) $request->request->get('name', ''));
        if ($name === '') {
            throw new \InvalidArgumentException('Nom de la carte requis');
        }

        /** @var UploadedFile|null $file */
        $file = $request->files->get('image');
        if (!$file instanceof UploadedFile) {
            throw new \InvalidArgumentException('Image requise');
        }

        $ext = strtolower((string) $file->guessExtension());
        if ($ext === '' || !in_array($ext, ['png', 'jpg', 'jpeg', 'webp'], true)) {
            throw new \InvalidArgumentException('Format image invalide (png/jpg/jpeg/webp)');
        }

        $dir = $this->projectDir . '/public/uploads/maps';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $filename = sprintf('map_%s.%s', bin2hex(random_bytes(8)), $ext);
        $file->move($dir, $filename);

        $map = new Map();
        $map->setName($name);

        // on stocke un chemin web (public)
        $map->setImagePath('/uploads/maps/' . $filename);

        // zones optionnelles si tu as déjà la colonne JSON dans Map
        $zonesRaw = $request->request->get('zones');
        if ($zonesRaw !== null && $zonesRaw !== '') {
            $zones = json_decode((string) $zonesRaw, true);
            if (!is_array($zones)) {
                throw new \InvalidArgumentException('zones invalide (JSON attendu)');
            }
            if (method_exists($map, 'setZones')) {
                $map->setZones($zones);
            }
        }

        $this->em->persist($map);
        $this->em->flush();

        return $map;
    }

    public function update(User $user, int $id, array $data): Map
    {
        $this->assertAdminOrMj($user);

        $map = $this->mapRepo->find($id);
        if (!$map) {
            throw new \RuntimeException('Map not found');
        }

        if (array_key_exists('name', $data)) {
            $name = trim((string) $data['name']);
            if ($name === '') {
                throw new \InvalidArgumentException('Nom de la carte requis');
            }
            $map->setName($name);
        }

        if (array_key_exists('zones', $data)) {
            if (!is_array($data['zones'])) {
                throw new \InvalidArgumentException('zones invalide (array attendu)');
            }
            if (!method_exists($map, 'setZones')) {
                throw new \RuntimeException('Map::setZones manquant (ajoute une colonne JSON zones dans Map)');
            }
            $map->setZones($data['zones']);
        }

        $this->em->flush();
        return $map;
    }

    public function delete(User $user, int $id): void
    {
        $this->assertAdminOrMj($user);

        $map = $this->mapRepo->find($id);
        if (!$map) {
            throw new \RuntimeException('Map not found');
        }

        // option: supprimer le fichier
        $imagePath = method_exists($map, 'getImagePath') ? (string) $map->getImagePath() : '';
        if ($imagePath !== '' && str_starts_with($imagePath, '/uploads/maps/')) {
            $full = $this->projectDir . '/public' . $imagePath;
            if (is_file($full)) {
                @unlink($full);
            }
        }

        $this->em->remove($map);
        $this->em->flush();
    }

    /** @return array<string, mixed> */
    public function toArray(Map $map): array
    {
        $out = [
            'id' => $map->getId(),
            'name' => $map->getName(),
            'imagePath' => $map->getImagePath(),
        ];

        if (method_exists($map, 'getZones')) {
            $out['zones'] = $map->getZones();
        }

        return $out;
    }
}
