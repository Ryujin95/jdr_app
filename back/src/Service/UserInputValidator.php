<?php

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/** Shared validation for plain user input, before values are persisted or hashed. */
final class UserInputValidator
{
    public function __construct(private ValidatorInterface $validator) {}

    public function email(mixed $value): string
    {
        if (!is_string($value)) {
            throw new UnprocessableEntityHttpException('Email invalide.');
        }

        $email = strtolower(trim($value));
        $this->assertValid($email, [
            new Assert\NotBlank(message: 'L’email est obligatoire.'),
            new Assert\Email(message: 'Adresse email invalide.'),
            new Assert\Length(max: 180, maxMessage: 'Adresse email trop longue.'),
        ]);

        return $email;
    }

    public function username(mixed $value): string
    {
        if (!is_string($value)) {
            throw new UnprocessableEntityHttpException('Pseudo invalide.');
        }

        $username = trim($value);
        $this->assertValid($username, [
            new Assert\NotBlank(message: 'Le pseudo est obligatoire.'),
            new Assert\Length(
                min: 3,
                max: 30,
                minMessage: 'Le pseudo doit contenir au minimum 3 caractères.',
                maxMessage: 'Le pseudo doit contenir au maximum 30 caractères.',
            ),
        ]);

        return $username;
    }

    public function password(mixed $value): string
    {
        if (!is_string($value)) {
            throw new UnprocessableEntityHttpException('Mot de passe invalide.');
        }

        $this->assertValid($value, [
            new Assert\NotBlank(message: 'Le mot de passe est obligatoire.'),
            new Assert\Length(
                min: 8,
                minMessage: 'Le mot de passe doit contenir au minimum 8 caractères.',
            ),
            new Assert\Regex(pattern: '/[A-Z]/', message: 'Le mot de passe doit contenir au moins une majuscule.'),
            new Assert\Regex(pattern: '/[a-z]/', message: 'Le mot de passe doit contenir au moins une minuscule.'),
            new Assert\Regex(pattern: '/\d/', message: 'Le mot de passe doit contenir au moins un chiffre.'),
            new Assert\Regex(pattern: '/[^A-Za-z0-9]/', message: 'Le mot de passe doit contenir au moins un caractère spécial.'),
        ]);

        return $value;
    }

    private function assertValid(string $value, array $constraints): void
    {
        $violations = $this->validator->validate($value, $constraints);
        if (count($violations) > 0) {
            throw new UnprocessableEntityHttpException($violations[0]->getMessage());
        }
    }
}
