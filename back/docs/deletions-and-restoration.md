# Suppressions et restaurations

## Comportement préparé

| Objet | Corbeille / restauration | Suppression définitive |
| --- | --- | --- |
| Personnage | Le marqueur `deleted` est réversible ; ses relations restent en place. La restauration est refusée en conflit si le propriétaire a déjà un personnage actif dans la campagne. | Supprime attributs (cascade ORM), compétences, relations entrantes et sortantes, permissions de connaissance, secrets et positions. |
| Lieu | Le marqueur `deleted` est réversible ; personnages et zones gardent leur lien. Les zones d’un lieu en corbeille sont masquées. | Détache les personnages en conservant leurs données, puis supprime zones et positions. |
| Carte | Pas de corbeille ni de restauration. | Supprime zones et positions ; détache la carte sélectionnée de la campagne. Supprime l’image gérée après validation SQL. |
| Campagne | Pas de corbeille ni de restauration. | Supprime memberships, cartes, zones et positions ; conserve personnages et lieux en retirant leur campagne. Supprime ensuite les images gérées. |
| Zone | Pas de corbeille ni de restauration. | Supprimée avec sa carte ou le lieu associé ; les positions sont supprimées dans la même transaction. |
| Compte | Le marqueur `deleted` est réversible. | La suppression physique est transactionnelle. Les références encore présentes bloquent l’opération et produisent un conflit ; aucune campagne, personnage ou permission n’est effacé implicitement. L’avatar géré est nettoyé après commit. |

Les opérations SQL groupées passent par `EntityManager::wrapInTransaction()`. Une erreur SQL annule l’ensemble de la suppression. Les suppressions de carte, campagne, personnage et compte nettoient les fichiers gérés uniquement après le commit SQL. Le système de fichiers ne participant pas à la transaction, un échec de nettoyage est journalisé et laisse le fichier en place pour récupération ; la suppression en base reste validée.

Les URL de carte hors de `/uploads/maps/`, les avatars hors de `/image/`, les noms contenant un chemin et les fichiers absents ne sont pas supprimés. Les zones désactivées restent visibles pour le parcours d’édition MJ ; les zones liées à un lieu en corbeille et les personnages supprimés ne sont pas exposés dans le payload cartographique. Une référence intercampagne incohérente bloque la suppression concernée avec un conflit.

## Décisions encore à valider

- Politique de suppression définitive d’un compte qui a encore des campagnes, personnages possédés ou médias personnels : le comportement actuel bloque sur les références SQL, sans anonymisation ni transfert automatique.
- Conservation des personnages et lieux lors de la suppression d’une campagne : le code suit les associations Doctrine nullable avec `ON DELETE SET NULL`.
- La base configurée et `back/compose.yaml` ne désignent pas le même moteur. Les tests avec base et les vérifications sur données existantes restent à exécuter sur une cible validée.

## Vérifications

Commandes backend : `php bin/console lint:container --env=test`, `php vendor/bin/phpunit`. Le conteneur a été linté ; PHPUnit est actuellement bloqué par l’extension PHP `mbstring` manquante. Les tests impliquant la base n’ont pas été lancés.
