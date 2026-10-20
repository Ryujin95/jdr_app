<?php
// back/src/Service/MapService.php

namespace App\Service;

use App\Entity\Map\Map;
use App\Entity\Campaign;
use App\Entity\User;
use App\Repository\Map\MapRepository;
use App\Repository\Map\ZoneRepository;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

class MapService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MapRepository $mapRepo,
        private ZoneRepository $zoneRepo,
        private CampaignAuthorization $campaignAuthorization,
        private string $projectDir,
        private ManagedMediaCleanupService $mediaCleanup,
    ) {}

    /** @return array<int, array<string, mixed>> */
    public function listForUser(User $user, ?int $campaignId = null): array
    {
        if ($campaignId === null || $campaignId <= 0) {
            throw new AccessDeniedHttpException('campaignId requis.');
        }

        $campaign = $this->campaignAuthorization->assertCampaignRole($campaignId, ['MJ', 'Player']);
        $maps = $this->mapRepo->findBy(['campaign' => $campaign], ['id' => 'DESC']);

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
            throw new NotFoundHttpException('Carte introuvable.');
        }
        $this->campaignAuthorization->assertResourceRole($map, ['MJ', 'Player']);
        return $map;
    }

    // multipart/form-data: campaignId, name, image(file)
    public function createFromRequest(User $user, Request $request): Map
{
    $campaignId = $request->request->get('campaignId');
    if (!is_numeric($campaignId)) {
        throw new \InvalidArgumentException('campaignId requis');
    }

    $campaign = $this->campaignAuthorization->assertCampaignRole((int) $campaignId, ['MJ']);

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
            throw new NotFoundHttpException('Carte introuvable.');
        }
        $this->campaignAuthorization->assertResourceRole($map, ['MJ']);

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
            throw new NotFoundHttpException('Carte introuvable.');
        }
        $this->campaignAuthorization->assertResourceRole($map, ['MJ']);

        $imagePath = $map->getImagePath();
        $this->em->wrapInTransaction(function (EntityManagerInterface $em) use ($map): void {
            foreach ($this->zoneRepo->findBy(['map' => $map]) as $zone) {
                if (
                    $zone->getLocation() !== null
                    && $zone->getLocation()?->getCampaign()?->getId() !== $map->getCampaign()?->getId()
                ) {
                    throw new ConflictHttpException('La carte contient une zone liée à un lieu d’une autre campagne.');
                }

                $em->createQuery('DELETE FROM App\\Entity\\Map\\CharacterZonePosition p WHERE p.zone = :zone')
                    ->setParameter('zone', $zone)
                    ->execute();
                $em->remove($zone);
            }

            $campaign = $map->getCampaign();
            foreach ($em->getRepository(Campaign::class)->findBy(['map' => $map]) as $attachedCampaign) {
                if ($attachedCampaign->getId() !== $campaign?->getId()) {
                    throw new ConflictHttpException('La carte est utilisée par une autre campagne.');
                }
            }
            if ($campaign?->getMap()?->getId() === $map->getId()) {
                $campaign->setMap(null);
            }
            $em->remove($map);
        });

        // Filesystem changes cannot join the SQL transaction. Delete the managed
        // upload only after the map and its dependent zones have committed.
        $this->mediaCleanup->cleanupMapImageAfterDeletion($imagePath);
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
