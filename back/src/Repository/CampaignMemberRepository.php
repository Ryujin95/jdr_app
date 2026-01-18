<?php
// back/src/Repository/CampaignMemberRepository.php

namespace App\Repository;

use App\Entity\CampaignMember;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CampaignMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CampaignMember::class);
    }
}
