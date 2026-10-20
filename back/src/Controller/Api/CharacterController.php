<?php
namespace App\Controller\Api;

use App\Repository\Character\CharacterRepository;
use App\Service\CharacterService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;
use Psr\Log\LoggerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException as SecurityAccessDeniedException;

#[Route('/api')]
class CharacterController extends AbstractController
{
    public function __construct(
        private CharacterService $characterService,
        private CharacterRepository $characterRepository,
        private LoggerInterface $logger,
    ) {}

    #[Route('/characters', name: 'api_characters_index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        try {
            $locationId = $this->optionalPositiveId($request, 'locationId');
            $campaignId = $this->optionalPositiveId($request, 'campaignId');
            $cards = $this->characterService->getCharacterCardsForCurrentUser($locationId, $campaignId);
            return new JsonResponse($cards, 200);
        } catch (BadRequestHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return new JsonResponse(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'not_found'], 404);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'characters.index');
        }
    }

    #[Route('/characters/{id}', name: 'api_characters_show', methods: ['GET'])]
    public function show(int $id, Request $request): JsonResponse
    {
        try {
            $character = $this->characterRepository->find($id);
            if (!$character) {
                return new JsonResponse(['message' => 'Character not found', 'code' => 'not_found'], 404);
            }
            $campaignId = $this->optionalPositiveId($request, 'campaignId');
            $data = $this->characterService->getCharacterDetailForCurrentUser($character, $campaignId);

            return new JsonResponse($data, 200);
        } catch (BadRequestHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return new JsonResponse(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'not_found'], 404);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'characters.show');
        }
    }

    #[Route('/characters', name: 'api_characters_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        try {
            $campaignId = $this->optionalPositiveId($request, 'campaignId');

            $character = $this->characterService->createFromRequest($request, $campaignId);
            $data = $this->characterService->getCharacterDetailForCurrentUser($character, $campaignId);

            return new JsonResponse($data, 201);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (JsonException $e) {
            return new JsonResponse(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (BadRequestHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return new JsonResponse(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'not_found'], 404);
        } catch (ConflictHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'conflict'], 409);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'characters.create');
        }
    }

    #[Route('/characters/{id}', name: 'api_characters_update', methods: ['POST', 'PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        try {
            $character = $this->characterRepository->find($id);
            if (!$character) {
                return new JsonResponse(['message' => 'Character not found', 'code' => 'not_found'], 404);
            }
            $campaignId = $this->optionalPositiveId($request, 'campaignId');

            $character = $this->characterService->updateFromRequest($character, $request, $campaignId);
            $data = $this->characterService->getCharacterDetailForCurrentUser($character, $campaignId);

            return new JsonResponse($data, 200);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (JsonException $e) {
            return new JsonResponse(['message' => 'Corps JSON invalide.', 'code' => 'invalid_json'], 400);
        } catch (BadRequestHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return new JsonResponse(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'not_found'], 404);
        } catch (ConflictHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'conflict'], 409);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'characters.update');
        }
    }

    #[Route('/locations/{locationId}/characters', name: 'api_characters_by_location', methods: ['GET'])]
    public function charactersByLocation(int $locationId, Request $request): JsonResponse
    {
        try {
            $campaignId = $this->optionalPositiveId($request, 'campaignId');
            $cards = $this->characterService->getCharacterCardsForCurrentUser($locationId, $campaignId);
            return new JsonResponse($cards, 200);
        } catch (BadRequestHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'validation_error'], 400);
        } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'forbidden'], 403);
        } catch (SecurityAccessDeniedException $e) {
            return new JsonResponse(['message' => 'Accès refusé.', 'code' => 'forbidden'], 403);
        } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e) {
            return new JsonResponse(['message' => $e->getMessage(), 'code' => 'not_found'], 404);
        } catch (\Throwable $e) {
            return $this->serverError($e, 'characters.by_location');
        }
    }

    private function serverError(\Throwable $exception, string $operation): JsonResponse
    {
        $errorId = bin2hex(random_bytes(8));
        $this->logger->error('Unexpected character API failure.', [
            'operation' => $operation,
            'error_id' => $errorId,
            'exception_class' => $exception::class,
            'exception_file' => $exception->getFile(),
            'exception_line' => $exception->getLine(),
        ]);

        return new JsonResponse(['message' => 'Erreur serveur.', 'code' => 'server_error', 'errorId' => $errorId], 500);
    }

    private function optionalPositiveId(Request $request, string $field): ?int
    {
        $raw = $request->query->get($field);
        if ($raw === null || $raw === '') return null;

        $value = filter_var($raw, FILTER_VALIDATE_INT);
        if ($value === false || $value <= 0) {
            throw new BadRequestHttpException(sprintf('%s doit être un entier positif.', $field));
        }

        return $value;
    }
}
