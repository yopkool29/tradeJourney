# Plan global de refactorisation

> Branche de travail : `refactor`
>
> Ce document suit le plan de réduction du code et l'avancement réel des travaux.
> Les modifications restent locales : aucun push ni commit automatique.

## Objectifs

- Réduire fortement la duplication et le volume du code.
- Limiter les responsabilités de chaque composant, composable et endpoint.
- Centraliser les règles métier et les calculs analytiques.
- Améliorer la fiabilité des types et des validations.
- Supprimer le code mort confirmé sans casser les chargements dynamiques Nuxt.
- Préserver les contrats API, les imports, les backups et le système de plugins.
- Maintenir ou renforcer les tests avant chaque extraction importante.

## Phase de consolidation et réduction nette

La décomposition des gros fichiers est une étape intermédiaire. Elle ne constitue pas à elle seule une réduction du volume total. Après chaque série d'extractions, une phase de consolidation est obligatoire :

- mesurer le total des lignes, pas uniquement la taille des fichiers principaux ;
- supprimer les duplications introduites ou révélées par le découpage ;
- fusionner les composables trop petits lorsqu'ils appartiennent au même domaine ;
- remplacer les wrappers et fonctions de relais par des fonctions partagées ;
- centraliser les configurations déclaratives ;
- supprimer le code mort devenu évident après migration ;
- ne conserver une abstraction que si elle réduit la complexité ou est réutilisée ;
- valider un gain net avant de considérer le lot comme terminé.

Les extractions GUI actuelles seront donc suivies d'un lot de consolidation avant de poursuivre vers d'autres composants volumineux.

### Consolidation en cours

- [x] Réduire la duplication des options de charts dans `BreakdownWidget.vue`.
- [x] Mesurer et consolider les composables dashboard trop fragmentés.
  - [x] Fusionner les composables de dates et de watchers en `useDashboardFilters.ts`.
  - [x] Fusionner la détection des breakpoints et la composition des widgets dans `useDashboardGridLayout.ts`.
  - [x] Fusionner la logique workspace, les actions et la synchronisation dans `useDashboardWorkspace.ts`.
- [~] Supprimer les wrappers devenus inutiles.
  - [x] Supprimer `modalHeightClass` dans `TimeSeriesWidget.vue`, qui retournait toujours `undefined`.
  - [x] Supprimer les duplications de labels de dimensions entre widget et tableau.
  - [x] Centraliser le formatage numérique partagé entre dashboard et risk ratios.
  - [x] Corriger un premier lot d'erreurs TypeScript GUI (`AdvancedFilters`, `TradeFilters`, `ModalRunner`, `Options`).
  - [x] Corriger les types GUI de `ColumnVisibilityMenu`, `PnLCalendar` et `ProfileExecute`.
  - [x] Supprimer les variables et fonctions mortes de `ProfileExecute`.
  - [x] Corriger les erreurs TypeScript GUI restantes (`SymbolCreateModal`, `CreateModal`, `ProfileForm`, `Accounts`, `NotePickerModal`, `Tools`).
  - [x] Réordonner les attributs Vue via `--fix` (`AppHeader`, `RenameModal`, `TagsManager`, `Tools`).
  - [x] Extraire la logique de NotesPanel dans `useNotesPanel.ts` (636 → 318 lignes).
  - [x] Extraire la logique de grille calendrier dans `useCalendarGrid.ts` (627 → 365 lignes).
  - [x] Extraire les formatters et helpers de TradeChart dans `useTradeChartFormatters.ts` et `useTradeChartHelpers.ts` (864 → 451 lignes).
  - [x] Extraire la logique de merge/reset des settings dans `useSettingsForm.ts` (684 → 544 lignes).
  - [x] Centraliser les headers de colonnes trade dans `utils/tradeColumnHeaders.ts` (duplication supprimée dans `Table.vue` et `TradeGroup.vue`).
  - [x] Extraire la logique de formulaire de trade dans `useTradeForm.ts` (464 → 275 lignes).
  - [x] Extraire le calcul des stats journalières dans `useDailyStats.ts` (450 → 403 lignes).
  - [x] Centraliser les blocs tooltip dans `buildTooltipBlock` (822 → 757 lignes).
  - [x] Extraire la logique CRUD des tags dans `useTagsManager.ts` (431 → 277 lignes).
  - [x] Extraire les générateurs de charts dans `utils/dashboardChartGenerators.ts` (710 → 377 lignes).
  - [x] Extraire la logique CRUD des comptes dans `useAccountsManager.ts` (402 → 151 lignes).
  - [x] Extraire filtres/tri/pagination de TradeTable dans `useTradeTableFilters.ts` (678 → 500 lignes).
  - [x] Extraire la config TimeSeries dans `useTimeSeriesConfig.ts` (620 → 497 lignes).
  - [x] Extraire les chart options de BreakdownWidget dans `useBreakdownChartOptions.ts` (617 → 407 lignes).
  - [x] Extraire les actions CRUD de TradeGroup dans `useTradeGroupActions.ts` (581 → 366 lignes).
- [x] Réduire la duplication des regroupements de séries dans `TimeSeriesWidget.vue`.
- [x] Centraliser la configuration commune `grid` et `dataZoom` de `TimeSeriesWidget.vue`.
- [x] Centraliser les builders d'axes catégorie et valeur de `TimeSeriesWidget.vue`.
- [x] Centraliser le formatage des labels de dimensions entre `BreakdownWidget.vue` et `BreakdownTable.vue`.
- [x] Mesurer la réduction nette globale avant de poursuivre vers d'autres widgets.

## État de départ

- 112 composants Vue.
- 262 fichiers TypeScript.
- 77 endpoints API.
- Environ 53 000 lignes de code applicatif comptabilisées.
- Fichiers principaux dépassant parfois 800 à 1 000 lignes.
- ESLint initialement bloqué avec Node 20 par `Object.groupBy`.
- Typecheck initial déjà en erreur sur ECharts, Prisma/H3, `tradeStats` et certains tests.
- Tests unitaires et parseurs existants fonctionnels.
- Tests d'intégration nécessitant un serveur Nuxt et une base de test.

## Avancement

### Phase 0 — Baseline et outillage

- [x] Créer la branche locale `refactor`.
- [x] Relever l'état Git initial.
- [x] Exécuter le build de référence.
- [x] Exécuter les tests unitaires et parseurs de référence.
- [x] Identifier les erreurs de type préexistantes.
- [x] Identifier le blocage ESLint lié à Node 20.
- [x] Aligner la version Node minimale sur `22.13.0` dans `package.json` et `Dockerfile`.
- [x] Ajouter une configuration initiale de `knip` dans `package.json`.

### Phase 1 — Nettoyage sûr

- [x] Qualifier les résultats `knip` au lieu de supprimer automatiquement les fichiers.
- [x] Identifier les faux positifs liés aux auto-imports Nuxt, `#components` et `resolveComponent`.
- [x] Supprimer les dépendances confirmées inutilisées :
  - [x] `chardet`
  - [x] `@vueuse/integrations`
  - [x] `@nuxtjs/tailwindcss`
  - [x] `@tailwindcss/typography`
  - [x] `@types/dotenv`
- [x] Mettre à jour `pnpm-lock.yaml`.
- [ ] Traiter les exports inutilisés un par un après vérification des auto-imports.
- [ ] Supprimer les scripts ou providers obsolètes confirmés.
- [ ] Auditer les pages et outils de test exposés.

### Phase 2 — Domaine analytique

- [x] Extraire les types et fonctions de présentation des métriques dans `composables/analytics/breakdownMetrics.ts`.
- [x] Migrer les imports vers le nouveau module.
- [x] Supprimer les réexports temporaires de `useAnalytics.ts`.
- [x] Factoriser le calcul commun des métriques 1D et 2D.
- [x] Conserver le comportement particulier de la heatmap concernant MFE/MAE.
- [x] Extraire les fonctions de regroupement temporel.
  - [x] Créer `composables/analytics/useBreakdownGrouping.ts` (437 → 296 lignes).
- [ ] Centraliser les configurations de métriques dans une définition déclarative.
- [ ] Réduire davantage `useAnalytics.ts`.
- [ ] Renforcer les cas limites analytics : zéro trade, drawdown, timezone, données manquantes.

### Phase 3 — Dashboard

- [~] Découper `components/dashboard/Index.vue`.
  - [x] Extraire la map des composants de widgets et sections.
  - [x] Extraire la construction des props des widgets.
  - [x] Extraire la détection des breakpoints.
  - [x] Extraire le calcul du layout responsive.
- [x] Extraire la gestion des filtres du dashboard.
  - [x] Extraire les champs de dates et leur passage en mode custom.
  - [x] Extraire la récupération de la plage historique.
  - [x] Extraire les watchers de filtres et le déclenchement debounced.
- [x] Extraire le chargement et le cache des données dashboard.
  - [x] Créer `useDashboardData.ts` (accountOptions, startingCapital, filters, fetch).
  - [x] Créer `useDashboardWorkspaceSwitch.ts` (switch + unsaved changes modal).
  - [x] `dashboard/Index.vue` : 585 → 478 lignes.
- [~] Extraire la persistance du layout et des workspaces.
  - [x] Extraire la synchronisation des workspaces entre bases.
  - [x] Extraire les actions de création, suppression, renommage et reset.
  - [x] Extraire la persistance du layout après édition.
- [x] Réduire `BreakdownWidget.vue`.
  - [x] Extraire les contrôles de dimensions, métriques et options de configuration.
  - [x] Extraire les chart options dans `useBreakdownChartOptions.ts` (617 → 407 lignes).
- [~] Réduire `TimeSeriesWidget.vue`.
  - [x] Extraire la config/settings dans `useTimeSeriesConfig.ts` (620 → 497 lignes).
  - [x] Corriger la densité des labels d'axe X (interval auto quand > 20 périodes).
- [ ] Centraliser les configurations des sections et widgets.
- [ ] Vérifier les tailles des chunks après découpage.

### Phase 4 — Trades et composants volumineux

- [~] Découper `components/trade/Table.vue`.
  - [x] Extraire filtres/tri/pagination dans `useTradeTableFilters.ts` (678 → 500 lignes).
- [~] Centraliser la configuration des colonnes.
  - [x] Supprimer le wrapper de chargement redondant de `Trade/Table.vue`.
  - [x] Factoriser les headers triables des colonnes Trade.
- [ ] Isoler l'édition inline et les actions de trade.
- [~] Découper `components/trade/TradeChart.vue`.
  - [x] Extraire les formatters et helpers (864 → 451 lignes).
  - [x] Restaurer `fetchBars`, `refetchBars`, `forcedInstrumentType` perdus lors du refactor.
- [~] Réduire `components/settings/Options.vue`.
  - [x] Extraire la logique de merge/reset dans `useSettingsForm.ts` (684 → 544 lignes).
- [~] Réduire `components/settings/TagsManager.vue`.
  - [x] Extraire la logique CRUD dans `useTagsManager.ts` (431 → 277 lignes).
- [~] Réduire `components/settings/Accounts.vue`.
  - [x] Extraire la logique CRUD dans `useAccountsManager.ts` (402 → 151 lignes).
- [ ] Extraire les états et transformations hors des templates.

### Phase 5 — Composables et stores

- [x] Auditer `dataStore.ts` et `dbState.ts`.
  - [x] Extraire les defaults dans `stores/dbStateDefaults.ts` (dbState : 699 → 521 lignes).
  - [x] Réutiliser `defaultDashBoardResult` dans `dataStore.ts` (74 → 48 lignes).
  - [x] Factoriser `clearDatabaseData` avec une boucle générique.
- [x] Réduire les composables inutilisés ou redondants.
  - [x] Supprimer `useMilkdownEditor.ts` (inutilisé).
  - [x] Supprimer `useNinjaTraderApi.ts` (inutilisé).
  - [x] Supprimer `useTradeNote.ts` (inutilisé).

### Phase 6 — API serveur

- [x] Centraliser le contexte de requête : `getApiContext` (auth + prisma + userId + dbName).
- [x] Standardiser le parsing des paramètres : `getValidatedId` (ID URL + validation).
- [x] Standardiser le parsing des corps : `parseBody` (readBody + Zod + erreur 400).
- [x] Vérifier l'isolation multi-base de données après chaque lot.
  - [x] 46 endpoints refactorés, build OK, 0 nouvelle erreur lint.

### Phase 7 — Imports

- [x] Définir une interface commune pour les parseurs.
  - [x] `server/utils/import/types.ts` — `ImportProvider`, `ParseContext`, `AccountTradesWithImportName`.
- [x] Créer un registre des providers d'import.
  - [x] `server/utils/import/registry.ts` — 5 providers (MT5, NT8, Quantower, IBKR, Standard).
- [x] Extraire le service d'import de `server/api/import.post.ts`.
  - [x] `server/utils/import/importService.ts` — `processTrades`, `updateSymbols`, `findSymbolByNameOrAlias`, `upsertDayTagsForImport`.
  - [x] `import.post.ts` : 483 → 129 lignes (-73%).

### Phase 8 — Organisation des composables

- [x] Classer les 78 composables en sous-dossiers par domaine fonctionnel.
  - [x] `analytics/` — métriques et regroupements (3 fichiers)
  - [x] `charts/` — builders ECharts, axes, tooltips (11 fichiers)
  - [x] `dashboard/` — layout, workspace, grid, filtres (10 fichiers, ex-`metrics/`)
  - [x] `trades/` — CRUD trades, form, table, chart, tags (9 fichiers)
  - [x] `notes/` — notes, images, screenshots (4 fichiers)
  - [x] `settings/` — settings, accounts, tags manager (6 fichiers)
  - [x] `data/` — accès données, API, cache, stores (10 fichiers)
  - [x] `import/` — import de trades, parseurs, profiles (3 fichiers)
  - [x] `ui/` — UI générique : toasts, modals, loading, debounce (12 fichiers)
  - [x] `auth/` — auth, session, navigation (4 fichiers)
  - [x] `system/` — logs, backup, storage, fix, utils (5 fichiers)
  - [x] 55 imports explicites mis à jour, build OK, 233 tests passent.
- [x] Isoler la résolution des symboles et alias.
  - [x] `server/utils/symbolResolver.ts` — `getCustomFieldValue`, `getAliases`, `getAliasList`, `matchesAlias` (côté serveur).
  - [x] `utils/aliasResolver.ts` — miroir côté client pour composables et composants.
  - [x] Appliqué dans `importService.ts`, `config-symbols/index.post.ts`, `config-symbols/index.patch.ts`, `account/index.post.ts`, `account/index.patch.ts`, `useAccountsManager.ts`, `Accounts.vue`, `TradingSymbols.vue`.
- [x] Conserver les tests sur les fixtures MT5, NinjaTrader, Quantower, IBKR et CSV.
  - [x] 47 tests d'import passent (MT5, NT, Quantower, IBKR, Standard CSV, date-parsing).

### Phase 8 — Types, schémas et traductions

- [x] Réduire progressivement les `any` et préférer `unknown` ou des schémas précis.
  - [x] 25/27 occurrences corrigées (parseurs, dayTagCleanup, useDebounce, dashboard.ts, myexport.ts, endpoints account/symbol/fix/trades, TradeGroup.vue, TradeDetailModal.vue).
  - [x] 2 restantes : `columns as any` / `getTagStyle as any` dans TradeGroup.vue (mismatch de props entre composants — nécessite typage des props du composant enfant).
- [x] Centraliser les primitives Zod communes.
  - [x] `schema/primitives.ts` — `idField`, `dateOrStringField`, `dateField`, `nullableOptionalString`, `idArrayField`, `nameField`.
  - [x] Appliqué dans 9 schémas (account, dayTag, importProfile, note, symbol, tagGroup, tag, trade, user).
- [ ] Harmoniser les noms `Schema`, `Type`, `Dashboard` et `Trade`.
- [ ] Convertir les fichiers de traduction JS en TypeScript.
- [ ] Décomposer les traductions par domaine.
- [x] Détecter les clés de traduction inutilisées ou absentes.
  - [x] 6 clés frontend manquantes ajoutées (calendar, trade.journal, common.modal).
  - [x] 66 tags serveur manquants identifiés (non traités — message brut affiché en fallback).
  - [x] 370 clés potentiellement inutilisées identifiées (à vérifier manuellement avant suppression).

### Phase 9 — Validation finale

- [x] Faire passer ESLint globalement.
  - [x] 0 erreurs, 1 warning pré-existant (FormModal.vue `vue/require-explicit-emits`).
  - [x] 62 erreurs corrigées (unused vars, `any` → `unknown`, `import type`, empty blocks).
- [x] Réduire les erreurs TypeScript préexistantes.
  - [x] Erreurs introduites par le refactor corrigées (parseurs, myexport, registry, types).
  - [x] Erreurs pré-existantes restantes : ~50 (AppHeader, BackupManager, DetailedNoteToggle, etc.) — non liées au refactor.
- [x] Faire passer les tests unitaires et parseurs.
  - [x] 280 tests passés (15 suites : unit + import).
- [ ] Faire fonctionner les tests d'intégration avec un serveur et une base de test.
- [x] Faire passer le build production.
- [x] Relancer `knip` avec une liste de faux positifs maîtrisée.
  - [x] 35 unused files + 30 unused exports — tous faux positifs (auto-imports Nuxt, scripts CLI, i18n dynamique).
- [x] Mesurer les lignes, fichiers, exports et dépendances avant/après.
- [ ] Réaliser une revue finale des changements locaux.

## Périmètre prioritaire

Le refactor porte principalement sur le GUI et la factorisation frontend.

### Zones à privilégier

- composants Vue ;
- pages et layouts ;
- composables frontend ;
- stores liés à l'état d'affichage ;
- logique de présentation ;
- charts et widgets ;
- factorisation des templates et configurations ;
- réduction des duplications ;
- types frontend indépendants de Prisma ;
- performance de rendu et découpage des gros composants.

### Zones à préserver

- `server/api/**` ;
- services serveur déjà propres ;
- schémas Prisma et migrations ;
- modèles et accès aux bases de données ;
- contrats API ;
- parseurs d'import côté serveur ;
- système de backup ;
- formats de données persistées.

Le serveur ou les schémas de données ne doivent être modifiés que si cela devient strictement nécessaire pour corriger un problème identifié. Toute exception devra être isolée dans un lot séparé et validée spécifiquement.

## Règles de travail

- Aucun `git push`.
- Aucun commit automatique.
- Aucun changement irréversible sans confirmation explicite.
- Pas de suppression fondée uniquement sur `knip`.
- Pas de changement de contrat API sans migration dédiée.
- Chaque extraction importante doit conserver les tests comportementaux.
- Les tests doivent privilégier les entrées/sorties réelles plutôt que les mocks.
- Les fichiers JavaScript modifiés doivent idéalement être convertis en TypeScript lorsqu'ils ne sont pas trop anciens ou volumineux.
- Le GUI est prioritaire ; `server/api` et Prisma restent hors périmètre par défaut.

## Mesure intermédiaire

Mesure effectuée après la phase de consolidation GUI + nettoyage lint + extraction des gros composants + centralisation des headers + déduplication des tooltips + extraction des générateurs de charts + extraction des config/settings + extraction des chart options + extraction du grouping analytique + extraction du data loading dashboard :

- volume suivi par Git au départ : environ `52 649` lignes ;
- volume suivi par Git actuellement : environ `44 504` lignes ;
- gain net suivi par Git : environ `8 145` lignes ;
- `components/dashboard/Index.vue` : environ `1 050` → `478` lignes ;
- `composables/useAnalytics.ts` : environ `682` → `296` lignes ;
- `components/trade/Table.vue` : environ `922` → `506` lignes ;
- `components/trade/TradeChart.vue` : `864` → `453` lignes ;
- `components/trade/FormModal.vue` : `464` → `275` lignes ;
- `components/NotesPanel.vue` : `636` → `318` lignes ;
- `components/calendar/Index.vue` : `627` → `365` lignes ;
- `components/settings/Options.vue` : `684` → `544` lignes ;
- `components/settings/TagsManager.vue` : `431` → `277` lignes ;
- `components/settings/Accounts.vue` : `402` → `151` lignes ;
- `components/daily/Index.vue` : `450` → `403` lignes ;
- `components/daily/TradeGroup.vue` : `606` → `366` lignes ;
- `composables/charts/useChartBuilder.ts` : `822` → `757` lignes ;
- `utils/dashboard.ts` : `710` → `377` lignes ;
- `TimeSeriesWidget.vue` : `665` → `497` lignes ;
- `BreakdownWidget.vue` : environ `769` → `407` lignes.

### Lint

- ESLint global : **0 erreurs**, 1 warning (pré-existant, non bloquant).

### Tests

- 280 tests passés, 0 échec ;
- 9 suites d'intégration non exécutées (requièrent un serveur Nuxt actif, non liées au refactor).

### Build

- Build production Nuxt réussi sans erreur.

### Mesure finale

- volume frontend (components + composables + utils + pages + stores + layouts + plugins) : environ `29 590` lignes ;
- volume server/ : environ `9 649` lignes ;
- volume tests/ : environ `4 194` lignes ;
- 420 fichiers suivis (89 composants, 79 composables, 106 fichiers server) ;
- 65 fichiers modifiés dans ce lot (types, schémas, traductions, lint) ;
- 1 nouveau fichier : `schema/primitives.ts` (22 lignes).

## Vérifications déjà effectuées

- Build production : réussi après les premiers lots et après le refactor analytique.
- Tests analytics : `50 passed`.
- Tests unitaires et parseurs de référence : réussis.
- ESLint ciblé sur les fichiers refactorisés : réussi avec Node 22.
- ESLint global : erreurs préexistantes à traiter progressivement.
- Typecheck global : erreurs pré-existantes à traiter progressivement.
- Tests d'intégration : nécessitent le serveur Nuxt et l'environnement de base de données.

## Corrections de bugs (hors refactor)

- Collage de screenshots sur Firefox : `navigator.clipboard.read()` échouait sur Firefox (restriction de permission). Remplacé par l'événement `paste` natif qui fonctionne sur tous les navigateurs.
- Chart Polygon : ligne pointillée entry→exit ajoutée pour le trade principal (était seulement dessinée pour les trades adjacents).
- Chart Polygon : trades inactifs (`active: false`) exclus du chargement des trades adjacents.
- `ScreenshotManager.vue` : default `maxScreenshots: 9` ajouté, `cleanup` unused retiré.

## Prochain lot

- Harmoniser les noms `Schema`/`Type`/`Dashboard`/`Trade`.
- Convertir les traductions JS → TS et décomposer par domaine.
- Faire passer les tests d'intégration avec un serveur et une base de test.
