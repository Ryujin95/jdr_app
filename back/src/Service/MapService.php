<?php
// back/src/Service/MapService.php

namespace App\Service;

use App\Entity\Campaign;
use App\Entity\Map\Map;
use App\Entity\User;
use App\Repository\Campaign\CampaignRepository;
use App\Repository\Map\MapRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

class MapService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MapRepository $mapRepo,
        private CampaignRepository $campaignRepo,
        private string $projectDir,
    ) {}

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user, ?int $campaignId = null): array
    {
        // On filtre par campagne si fourni (important)
        if ($campaignId !== null) {
            $campaign = $this->campaignRepo->find($campaignId);
            if (!$campaign instanceof Campaign) {
                throw new \RuntimeException('Campaign not found');
            }
            $maps = $this->mapRepo->findBy(['campaign' => $campaign], ['id' => 'DESC']);
        } else {
            $maps = $this->mapRepo->findBy([], ['id' => 'DESC']);
        }

        $out = [];
        foreach ($maps as $m) {
            $out[] = $this->toArray($m);
        }
        return $out;
    }

    public function get(User $user, int $id): Map
    {
        $map = $this->mapRepo->find($id);
        if (!$map) {
            throw new \RuntimeException('Map not found');
        }
        return $map;
    }

    // multipart/form-data: campaignId, name, image(file)
    public function createFromRequest(User $user, Request $request): Map
{
    $campaignId = $request->request->get('campaignId');
    if (!is_numeric($campaignId)) {
        throw new \InvalidArgumentException('campaignId requis');
    }

    $campaign = $this->campaignRepo->find((int) $campaignId);
    if (!$campaign instanceof Campaign) {
        throw new \RuntimeException('Campaign not found');
    }

    $name = trim((string) $request->request->get('name', ''));
    if ($name === '') {
        throw new \InvalidArgumentException('Nom de la carte requis');
    }

    /** @var UploadedFile|null $file */
    $file = $request->files->get('image');
    if (!$file instanceof UploadedFile) {
        throw new \InvalidArgumentException('Image requise');
    }

    // ✅ extension SANS dépendre de fileinfo
    $original = (string) $file->getClientOriginalName();
    $ext = strtolower((string) pathinfo($original, PATHINFO_EXTENSION));

    // fallback si pas d'extension dans le nom
    if ($ext === '') {
        $guessed = $file->guessExtension(); // peut planter si fileinfo absent -> on protège
        $ext = is_string($guessed) ? strtolower($guessed) : '';
    }

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
    $map->setCampaign($campaign);
    $map->setName($name);
    $map->setImagePath('/uploads/maps/' . $filename);

    $this->em->persist($map);
    $this->em->flush();

    return $map;
}


    public function update(User $user, int $id, array $data): Map
    {
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
            $map->setZones($data['zones']);
        }

        $this->em->flush();
        return $map;
    }

    public function delete(User $user, int $id): void
    {
        $map = $this->mapRepo->find($id);
        if (!$map) {
            throw new \RuntimeException('Map not found');
        }

        // Optionnel: supprimer le fichier image sur le disque
        $imagePath = (string) $map->getImagePath();
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
        return [
            'id' => $map->getId(),
            'name' => $map->getName(),
            'imagePath' => $map->getImagePath(),
            'campaignId' => $map->getCampaign()?->getId(),
            'zones' => $map->getZones(),
        ];
    }
}
