# Suivi des tests

## Décisions de cette étape

- PHPUnit 12.4.1 est déjà présent dans `vendor/`; aucune dépendance PHP n’a été ajoutée.
- `APP_ENV=test` charge `.env.test`. Les tests refusent de démarrer si l’environnement n’est pas `test`, si le DSN n’est pas exactement SQLite en mémoire, si le transport email n’est pas `null://null`, ou si le répertoire de stockage test n’est pas sa valeur isolée.
- La base de test en mémoire ne persiste pas de données et n’utilise aucun compte SQL. Le moteur et le schéma de développement n’étant pas confirmés, les tests nécessitant la base réelle attendent l’étape 2.
- Les clés JWT de test se trouvent sous `tests/Fixtures/jwt/` et le fichier de configuration JWT de test ne référence pas les clés locales de développement.
- En environnement test, les services d’upload écrivent sous `var/test/public/` plutôt que sous `public/`. Les médias de développement et de production ne sont pas utilisés pour les tests.
- Les emails de test sont envoyés au transport nul. Aucun serveur SMTP n’est contacté.
- `FixtureFactory` construit des entités non persistées pour les tests sans schéma.

## Commandes

Depuis `back/` :

```powershell
php tests/verify-isolation.php
php bin/phpunit --configuration phpunit.dist.xml
```

`verify-isolation.php` vérifie le garde-fou d’environnement, les rejets du DSN/email/répertoire de stockage non isolés, les fixtures, les clés JWT de test et la frontière du fichier temporaire. Il n’ouvre pas de connexion à la base.

Les tests de connexion/réinitialisation, autorisations et suppressions qui nécessitent une base sont à ajouter après l’étape 2, avec un compte exclusivement limité à la base de test une fois le moteur confirmé.

Depuis `front/`, après autorisation et installation de Vitest :

```powershell
npm test -- --run
```

## Résultats de départ de l’étape 1

- PHPUnit installé : 12.4.1. Son exécutable ne démarre pas dans le PHP actuellement sélectionné, car l’extension `mbstring` manque. Aucun remplacement ni installation PHP n’a été effectué.
- Le PDO local ne fournit que le pilote MySQL ; `pdo_sqlite` manque aussi. Les tests unitaires sans base restent indépendants de ce pilote ; l’usage d’une base de test demandera de fournir un pilote isolé ou de décider d’un autre backend après confirmation du moteur à l’étape 2.
- Le lint frontend préexistant échoue avec 8 erreurs et 5 avertissements ; il n’est pas modifié par cette étape.
- Vitest n’est pas encore installé : les manifests et le lockfile frontend restent en attente de l’accord demandé.
- Les commandes de validation du schéma et d’historique des migrations ont déjà échoué à se connecter à la base ; aucun test n’exécute de migration.

## Étape 2 — état préparatoire

- `CharacterKnowledge.viewer` est maintenant un `ManyToOne` unidirectionnel ; le côté `target` conserve sa relation inverse avec `Character.characterKnowledge`.
- `FixtureFactory::authorizationScenario()` construit sans persistance deux campagnes, deux MJ croisés, plusieurs joueurs, un non-membre, un administrateur, quatre personnages, leurs lieux, cartes, zones, positions, compétences, attributs, connaissances et relations.
- La vérification sans base couvre les liens du graphe de fixtures. La suite PHPUnit correspondante reste présente, mais ne peut pas être exécutée dans le PHP local tant que `mbstring` manque.
- Le moteur reste à confirmer : `DATABASE_URL` local déclare MySQL, tandis que Compose utilise PostgreSQL 16. La migration existante est MySQL et n’a pas été modifiée. Le statut des migrations et le schéma réel restent inconnus parce que la connexion n’est pas disponible.
- Aucune migration nouvelle n’a été créée ni appliquée. Aucun profil de base nommé « B » ou « M » n’est défini dans les configurations ou la documentation trouvées.

## Étape 21 — CI et procédure locale

La forge configurée est GitHub (`origin` pointe vers `github.com/Ryujin95/jdr_app`). Le workflow `.github/workflows/ci.yml` exécute sur Linux :

- `composer validate --no-check-publish`, `composer install` depuis `composer.lock`, le garde-fou d’isolation et PHPUnit ;
- `npm ci` depuis `package-lock.json`, les tests Node intégrés, ESLint et le build Vite.

PHPUnit utilise le DSN SQLite en mémoire, le transport email nul, les clés JWT dédiées de `tests/Fixtures/jwt/` et le répertoire `var/test/`. La CI génère un nouvel `APP_SECRET` à chaque exécution. Aucun secret de développement n’est requis. Les erreurs de test, lint ou build font échouer le job correspondant.

### Commandes locales équivalentes

PowerShell, depuis la racine du dépôt :

```powershell
Set-Location back
composer validate --no-check-publish
composer install --no-interaction --prefer-dist --no-progress
$env:APP_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
php tests/verify-isolation.php
php bin/console lint:container --env=test
php vendor/bin/phpunit --configuration phpunit.dist.xml

Set-Location ..\front
npm ci
node --test tests/*.test.js
npm run lint
npm run build
```

Si une commande échoue, son code de sortie fait échouer le job CI; localement, conserver la sortie complète avec la commande et la version de PHP/Node pour diagnostiquer l’écart. Ne pas remplacer `npm ci` par `npm install` ni `composer install` par `composer update` lors d’une vérification reproductible.

### Limite du pipeline de migration

La CI ne lance pas encore `doctrine:migrations:migrate`. Ce serait une validation trompeuse : `.env.test` configure SQLite, `DATABASE_URL` de développement et la migration existante indiquent MySQL, tandis que `back/compose.yaml` déclare PostgreSQL 16. En outre, l’historique ne contient qu’une migration qui crée les tables de compte et de messagerie, pas le schéma complet des entités. Aucun moteur n’a été validé et les migrations ne peuvent donc pas encore prouver une reconstruction propre. Les tests CI n’utilisent pas la base de développement.

Pour compléter la CI avec une base éphémère, il faut d’abord confirmer le moteur de référence, puis compléter et vérifier les migrations de reconstruction avant d’ajouter un job qui démarre ce moteur, applique les migrations et lance les tests dépendants de la base.

### Résultats locaux de préparation CI

- `composer validate --no-check-publish` et `composer install --no-interaction --prefer-dist --no-progress` ont réussi sans changement de dépendances ; les scripts Symfony Composer ont réussi.
- `php tests/verify-isolation.php` a réussi sans ouvrir de connexion.
- PHPUnit n’a pas démarré : le PHP Windows disponible ne fournit pas `mbstring`.
- Les 11 tests frontend ont réussi sous Node 24 en désactivant l’isolation par processus du runner. Le mode standard a été refusé par le sandbox Windows (`spawn EPERM`).
- `npm run lint` a réussi. Le build Vite n’a pas pu lancer esbuild à cause de `spawn EPERM`.
- `npm ci` standard a aussi été refusé par `spawn EPERM`; les dépendances locales ont été restaurées depuis le lockfile avec les scripts npm désactivés. Ce contournement n’est pas utilisé dans le workflow Linux.
- Le workflow YAML a été analysé par le parseur YAML Symfony et `git diff --check` a réussi. Le pipeline distant n’a pas encore été lancé.
