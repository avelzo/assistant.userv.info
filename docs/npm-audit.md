# Audit npm du 2 novembre 2026

L’audit complet passe de **16 à 5 alertes modérées**. L’audit de production
(`npm audit --omit=dev`) reste à **0 vulnérabilité**.

Les 16 alertes initiales remontaient toutes à une même dépendance : `minimatch`,
signalée par [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
Le correctif est disponible à partir de la version 11.0.1.

## Correctifs appliqués

Des overrides ciblés installent `minimatch` 11.0.4 pour `eslint`,
`@eslint/config-array`, `@eslint/eslintrc` et
`@typescript-eslint/typescript-estree`. Leurs usages de `Minimatch` et de la
fonction nommée `minimatch` restent compatibles.

La comparaison avant/après confirme les mêmes 216 fichiers analysés et le même
diagnostic existant. Les tests de `scripts/lint-config.test.ts` vérifient les
exclusions et les règles Next.js, React, accessibilité et imports.

## Alertes restantes et suivi

Les cinq alertes restantes concernent `minimatch` 3.1.5 et ses consommateurs
`eslint-plugin-import` 2.32.0, `eslint-plugin-jsx-a11y` 6.10.2,
`eslint-plugin-react` 7.37.5 et, par propagation, `eslint-config-next` 16.4.4.

Ces plugins utilisent encore l’export CommonJS directement appelable de
`minimatch` 3 ; le plugin imports utilise aussi `makeRe`, supprimé en version 11.
Un override global ne permet donc pas de préserver ces API. Aucune règle ni
alerte n’est désactivée. La proposition `npm audit fix --force` de rétrograder
`eslint-config-next` vers 0.2.4 n’est pas adaptée à Next.js 16.

Le problème et la rupture de `makeRe` sont suivis dans
[eslint/eslint#21463](https://github.com/eslint/eslint/issues/21463).
Il reste à réexaminer les versions publiées de ces trois plugins, puis à retirer
les overrides lorsque leurs dépendances officielles incluront le correctif.
Les motifs concernés sont ceux de la configuration du lint ; ils ne sont pas
fournis par les utilisateurs de l’application.
