<?php
// src/Repository/FriendshipRepository.php

namespace App\Repository;

use App\Entity\Friendship;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class FriendshipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Friendship::class);
    }

    public function findBetweenUsers(User $a, User $b): ?Friendship
    {
        [$low, $high] = Friendship::orderPair($a, $b);

        return $this->createQueryBuilder('f')
            ->andWhere('f.userLow = :low')
            ->andWhere('f.userHigh = :high')
            ->setParameter('low', $low)
            ->setParameter('high', $high)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return array<int, Friendship>
     */
    public function listForUser(User $me, ?string $status = null): array
    {
        $qb = $this->createQueryBuilder('f')
            ->andWhere('f.userLow = :me OR f.userHigh = :me')
            ->setParameter('me', $me)
            ->orderBy('f.createdAt', 'DESC');

        if ($status) {
            $qb->andWhere('f.status = :status')->setParameter('status', $status);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return array<int, array<string,mixed>>
     */
    public function listAcceptedFriendsBasic(User $me): array
    {
        $rows = $this->createQueryBuilder('f')
            ->select('f.id AS friendshipId, IDENTITY(f.userLow) AS lowId, IDENTITY(f.userHigh) AS highId, f.status AS status, f.acceptedAt AS acceptedAt')
            ->andWhere('f.status = :st')
            ->andWhere('f.userLow = :me OR f.userHigh = :me')
            ->setParameter('st', Friendship::STATUS_ACCEPTED)
            ->setParameter('me', $me)
            ->orderBy('f.acceptedAt', 'DESC')
            ->getQuery()
            ->getArrayResult();

        return $rows;
    }

    public function deleteExpiredPending(\DateTimeImmutable $cutoff): int
    {
        return $this->createQueryBuilder('f')
            ->delete()
            ->andWhere('f.status = :st')
            ->andWhere('f.createdAt < :cutoff')
            ->setParameter('st', Friendship::STATUS_PENDING)
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->execute();
    }

    /** @return array<int, Friendship> */
    public function findIncomingPending(User $me): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.status = :st')
            ->andWhere('f.requestedBy != :me')
            ->andWhere('f.userLow = :me OR f.userHigh = :me')
            ->setParameter('st', Friendship::STATUS_PENDING)
            ->setParameter('me', $me)
            ->orderBy('f.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** @return array<int, Friendship> */
    public function findOutgoingPending(User $me): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.status = :st')
            ->andWhere('f.requestedBy = :me')
            ->andWhere('f.userLow = :me OR f.userHigh = :me')
            ->setParameter('st', Friendship::STATUS_PENDING)
            ->setParameter('me', $me)
            ->orderBy('f.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
