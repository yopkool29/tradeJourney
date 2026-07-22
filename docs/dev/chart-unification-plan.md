# Plan d'unification des charts

Objectif : remplacer tous les charts spécialisés par des instances configurables de widgets unifiés (BreakdownWidget + TimeSeriesWidget), avec un système de templates pour création rapide.

## Bénéfices attendus

- **Moins de code** : ~730 lignes de composants spécialisés supprimés, ~390 lignes ajoutées (net -340 lignes)
- **7 composants → 2** : 1 BreakdownWidget + 1 TimeSeriesWidget au lieu de 7 composants dédiés
- **Logique centralisée** : plus de duplication de tooltips, couleurs, formatage, settings
- **Extensibilité** : ajouter un nouveau chart = quelques lignes dans un template, pas un nouveau composant
- **Configurabilité** : l'utilisateur peut changer dimension/métrique/aggregation sans créer un nouveau widget

## État actuel

### Charts de répartition (unifiés via BreakdownWidget) ✅

| Chart | Dimension | Métrique | Type | Statut |
|-------|-----------|----------|------|--------|
| BreakdownBar/Scatter/Table | configurable | configurable | bar/scatter/table | ✅ Fait |
| Barres verticales | configurable | configurable | barVertical | ✅ Fait |
| Heatmap 2D | 2 dimensions configurables | configurable | heatmap | ✅ Fait |

### Charts de répartition spécialisés (migrés) ✅

| Chart | Ancien composant | Template | Statut |
|-------|------------------|----------|--------|
| Heatmap Heure × Jour | `HourlyPnlHeatmap.vue` | `heatmapHourDay` | ✅ Migré |
| Taux de Gain par heure | `HourlyWinrateBar.vue` | `winrateByHour` | ✅ Migré |
| PnL moyen par jour | `DayOfWeekPnlChart.vue` | `pnlByDayOfWeek` | ✅ Migré |

### Charts de séries temporelles (unifiés via TimeSeriesWidget) ✅

| Chart | Ancien composant | Template | Statut |
|-------|------------------|----------|--------|
| Historique P&L par Trade | `PnlBarChartEcharts.vue` | `pnlByTrade` | ✅ Migré |
| PnL Cumulé | `CumulatedPnlChartEcharts.vue` | `cumulatedPnl` | ✅ Migré |
| APPT | `ApptChartEcharts.vue` | `appt` | ✅ Migré |
| Taux de Gain (wr) | `WinrateChartEcharts.vue` | `winrate` | ✅ Migré |

## Architecture cible

### BreakdownWidget ✅

Types de charts supportés :
- `bar` — barres horizontales ✅
- `scatter` — nuage de points ✅
- `table` — tableau ✅
- `barVertical` — barres verticales ✅
- `heatmap` — heatmap 2D (2 dimensions configurables) ✅

Dimensions disponibles :
- `ticker`, `side` (type), `month`, `monthYear`, `dayOfWeek`, `hourStart`, `hourEnd`
- `tagGroup_<name>` (dynamique)
- `dimension2` pour la heatmap (axe Y, sélectionnable)

Métriques disponibles :
- `pnl`, `appt`, `winrate`, `profitFactor`, `avgWin`, `avgLoss`, `expectancy`, `avgDuration`, `drawdown`, `currentDrawdown`, `tradesCount`

### TimeSeriesWidget ✅

Pour les charts de séries temporelles (P&L par trade, P&L cumulé, APPT, Winrate).

**Modes d'affichage** (déterminés automatiquement par la métrique) :
1. **Barres** (`pnl`, `appt`, `winrate`) — barres verticales pour les valeurs de chaque période. Pour `appt` et `winrate`, une courbe de moyenne mobile (MA) peut être affichée par-dessus (toggle `showMovingAverage`, fenêtre configurable).
2. **Area chart** (`cumulatedPnl`) — courbe remplie bicolore (equity curve) : vert au-dessus du seuil (starting capital), rouge en-dessous, zone remplie avec transparence. Ligne de threshold si starting capital > 0. Points de croisement calculés pour transition continue entre les couleurs.

Config :
```
{
  metric: 'pnl' | 'cumulatedPnl' | 'appt' | 'winrate',
  aggregation: 'day' | 'week' | 'month',  // pas pour 'pnl' (par trade)
  showBars: boolean,                       // toggle barres (winrate, appt)
  showMovingAverage: boolean,              // toggle MA (winrate, appt)
  movingAverageWindow: number,             // APPT (5), Winrate (3)
  maxTrades: number,                       // pour pnl par trade (50)
  showThreshold: boolean,                  // pour cumulatedPnl (startingCapital)
  yAxisMin: number,                        // winrate (0)
  yAxisMax: number,                        // winrate (100)
  yAxisFormat: 'currency' | 'percent' | 'number',
}
```

Réutilise les fonctions existantes :
- `generateCumulatedPnlChartData()` — `utils/dashboard.ts`
- `generateApptChartData()` — `utils/dashboard.ts`
- `generateWinrateChartData()` — `utils/dashboard.ts`
- `groupTradesByPeriod()` — `utils/dashboard.ts`
- `useAggregationCache()` — cache d'agrégation

### Système de templates/presets

Permet de créer rapidement un widget avec une config pré-définie, incluant les paramètres spécifiques au type de chart.

```ts
interface ChartTemplate {
  id: string
  labelKey: string
  widgetType: 'breakdown' | 'timeSeries'
  baseKey: BreakdownBaseKey  // pour breakdown
  config: Partial<BreakdownConfig | TimeSeriesConfig>
  // Paramètres spécifiques au template (override des defaults)
  params?: ChartTemplateParams
}

// Paramètres spécifiques selon le type de chart
interface ChartTemplateParams {
  // Série temporelle
  aggregation?: 'day' | 'week' | 'month'      // PnL cumulé, APPT, Winrate
  showBars?: boolean                           // Winrate (toggle barres)
  showMovingAverage?: boolean                  // Winrate, APPT (toggle MA)
  movingAverageWindow?: number                 // APPT (5), Winrate (3)
  maxTrades?: number                           // PnL par trade (50)
  showThreshold?: boolean                      // PnL cumulé (startingCapital)
  // Breakdown
  topN?: number                                // Top N filtre
  tooltipMetrics?: BreakdownMetric[]           // Métriques supplémentaires tooltip
  // Heatmap
  showWeekend?: boolean                        // Heatmap (auto si trades weekend)
  // Axes
  yAxisMin?: number                            // Winrate (0)
  yAxisMax?: number                            // Winrate (100)
  yAxisFormat?: 'currency' | 'percent' | 'number'  // Format axe Y
}
```

**Principe** : le template définit la config de base + les paramètres spécifiques. L'utilisateur peut ensuite modifier ces paramètres via le menu settings du widget. Les paramètres sont persistés dans la config de l'instance.

**Exemple concret — template Winrate** :
```ts
{
  id: 'winrate',
  labelKey: 'components.dashboard.winrate_chart.title',
  widgetType: 'timeSeries',
  baseKey: 'breakdownTimeSeries',
  config: { metric: 'winrate', chartType: 'timeSeries' },
  params: {
    aggregation: 'week',
    showBars: true,
    showMovingAverage: true,
    movingAverageWindow: 3,
    yAxisMin: 0,
    yAxisMax: 100,
    yAxisFormat: 'percent',
  }
}
```

**Exemple concret — template PnL par jour de semaine** :
```ts
{
  id: 'pnlByDayOfWeek',
  labelKey: 'components.dashboard.day_of_week.title',
  widgetType: 'breakdown',
  baseKey: 'breakdownBarVertical',
  config: { dimension: 'dayOfWeek', metric: 'pnl', chartType: 'barVertical' },
  params: {
    yAxisFormat: 'currency',
  }
}
```

Templates breakdown :
- `pnlByTicker` → bar, ticker, pnl
- `winrateByTicker` → scatter, ticker, winrate
- `pnlByDayOfWeek` → barVertical, dayOfWeek, pnl (yAxisFormat: currency)
- `winrateByHour` → barVertical, hourStart, winrate (yAxisMin: 0, yAxisMax: 100, yAxisFormat: percent)
- `pnlByMonth` → bar, month, pnl
- `pnlByMonthYear` → bar, monthYear, pnl
- `pnlByTagGroup` → bar, tagGroup_*, pnl
- `heatmapHourDay` → heatmap, hourDayOfWeek, pnl (showWeekend: auto)

Templates timeSeries :
- `pnlByTrade` → timeSeries, metric: pnl, maxTrades: 50 (pas d'agrégation, yAxisFormat: currency)
- `cumulatedPnl` → timeSeries, metric: cumulatedPnl, aggregation: week (showThreshold: true, yAxisFormat: currency)
- `appt` → timeSeries, metric: appt, aggregation: week, MA: 5, showBars: true, showMA: true (yAxisFormat: currency)
- `winrate` → timeSeries, metric: winrate, aggregation: week, MA: 3, showBars: true, showMA: true (yAxisMin: 0, yAxisMax: 100, yAxisFormat: percent)

### Menu settings par widget

Le menu settings (gear icon) affiche les paramètres pertinents selon le type de chart :

| Type de chart | Settings affichés |
|---------------|-------------------|
| breakdownBar / breakdownScatter | Dimension, Métrique, TopN, Tooltip metrics |
| breakdownBarVertical | Dimension, Métrique, TopN, Tooltip metrics, Y axis format |
| breakdownTable | Dimension, Colonnes (multi-select) |
| breakdownHeatmap | Dimension (fixe 2D), Métrique, Show weekend |
| timeSeries (pnl) | MaxTrades |
| timeSeries (cumulatedPnl) | Aggregation, Show threshold |
| timeSeries (appt) | Aggregation, Show bars, Show MA, MA window |
| timeSeries (winrate) | Aggregation, Show bars, Show MA, MA window |

Tous ces paramètres sont persistés dans la config de l'instance (`workspace.breakdownConfigs`).

### Remaniement du DashboardVisibilityMenu

Le menu actuel est organisé en 4 colonnes fixes avec des clés hardcodées (Charts | Temporel | Breakdowns | Sections). Après l'unification, les colonnes 1 et 2 (Charts + Temporel) disparaissent — tous ces charts deviennent des instances de templates.

**Nouvelle organisation du menu** :

```
┌─────────────────────────────────────────────────────────┐
│  + Ajouter un chart                                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Templates prêts à l'emploi (paramétrables)          │ │
│  │                                                      │ │
│  │ ▸ Répartition                                       │ │
│  │   PnL par Ticker          [+]                        │ │
│  │   Winrate par Ticker      [+]                        │ │
│  │   PnL par jour            [+]                        │ │
│  │   Winrate par heure       [+]                        │ │
│  │   PnL par mois            [+]                        │ │
│  │   Heatmap Heure × Jour    [+]                        │ │
│  │   PnL par Tag Group       [+]                        │ │
│  │                                                      │ │
│  │ ▸ Séries temporelles                                │ │
│  │   P&L par Trade           [+]                        │ │
│  │   P&L Cumulé              [+]                        │ │
│  │   APPT                    [+]                        │ │
│  │   Taux de Gain            [+]                        │ │
│  │                                                      │ │
│  │ ▸ Avancé (vide au départ)                           │ │
│  │   Barre horizontale       [+]                        │ │
│  │   Scatter                 [+]                        │ │
│  │   Table                   [+]                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Instances actuelles (toggle visibilité)                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ☑ PnL par Ticker (bar, ticker, pnl)                 │ │
│  │ ☑ Winrate par Ticker (scatter, ticker, winrate)     │ │
│  │ ☑ P&L par Trade (timeSeries, pnl)                   │ │
│  │ ☑ P&L Cumulé (timeSeries, cumulatedPnl, week)       │ │
│  │ ☐ Heatmap Heure × Jour (heatmap, hourDayOfWeek)     │ │
│  │ ...                                                  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Sections                                                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ☑ All Trades  ☑ Profit Trades  ☐ Losing Trades     │ │
│  │ ☑ Win/Loss    ☐ Risk Ratios     ☐ Day Statistics    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [Apply]  [Clear]  [Cancel]         ☐ Sync all breakpoints│
└─────────────────────────────────────────────────────────┘
```

**Principe** :
- **Section "Templates"** : liste des templates par catégorie (Répartition, Séries temporelles, Avancé). Chaque template a un bouton [+] qui crée une instance avec la config pré-définie. L'utilisateur peut ensuite modifier la config via le menu settings du widget.
- **Section "Instances actuelles"** : liste des instances existantes avec toggle de visibilité. Affiche un résumé de la config (type, dimension, métrique) pour identifier rapidement chaque instance.
- **Section "Sections"** : inchangée (All Trades, Profit Trades, etc.)

**Avantages** :
- Plus de clés hardcodées — tout est dynamique via les templates
- L'utilisateur voit exactement ce qu'il a (instances) et ce qu'il peut ajouter (templates)
- Les templates "Avancé" (bar, scatter, table) permettent de créer des charts from scratch pour les utilisateurs avancés
- Ajouter un nouveau template = quelques lignes dans `useBreakdownConfig.ts`, apparaît automatiquement dans le menu

### Persistance des settings

Actuellement les settings (cumuleMode, showBars, showMovingAverage) sont dans `dbStateStore.chartSettings` par clé de chart.

À migrer vers `BreakdownConfig`/`TimeSeriesConfig` par instance (déjà persisté dans `workspace.breakdownConfigs`).

## Plan d'implémentation

### Étape 1 : `barVertical` dans BreakdownWidget ✅
**Complexité** : Moyenne

- Ajouter `'barVertical'` à `BreakdownChartType` dans `type/index.ts`
- Ajouter `'breakdownBarVertical'` à `BreakdownBaseKey`
- Implémenter `barVerticalChartOption` dans `BreakdownWidget.vue` (axes inversés vs `barChartOption` : catégories sur axe X, valeurs sur axe Y)
- Ajouter config par défaut + taille grid dans `useBreakdownConfig.ts`
- Gérer `getBreakdownChartType` et `getBreakdownBaseKey` pour le nouveau préfixe

**Fichiers** :
- `type/index.ts`
- `components/dashboard/charts/breakdown/BreakdownWidget.vue`
- `composables/metrics/useBreakdownConfig.ts`

### Étape 2 : Système de templates/presets + remaniement du menu visibilité ✅
**Complexité** : Moyenne

- Définir `ChartTemplate` dans `type/index.ts`
- Ajouter `chartTemplates` (breakdown + timeSeries) dans `useBreakdownConfig.ts`, organisés par catégorie
- `createFromTemplate(templateId)` dans `useBreakdownInstances.ts`
- **Remanier `DashboardVisibilityMenu.vue`** :
  - Remplacer les 4 colonnes fixes par 3 sections : Templates (par catégorie) | Instances actuelles (toggle) | Sections
  - Section Templates : liste par catégorie (Répartition, Séries temporelles, Avancé) avec bouton [+] par template
  - Section Instances : liste dynamique des instances existantes avec toggle visibilité + résumé de config
  - Supprimer les clés hardcodées (`chartOptions`, `timeChartOptions`)
  - Garder la section Sections inchangée
  - Garder les actions Apply/Clear/Cancel + sync breakpoints

**Fichiers** :
- `type/index.ts`
- `composables/metrics/useBreakdownConfig.ts`
- `composables/metrics/useBreakdownInstances.ts` (ou `useBreakdownConfig.ts`)
- `components/dashboard/DashboardVisibilityMenu.vue`

### Étape 3 : Migration des charts de répartition spécialisés ✅
**Complexité** : Faible

- Remplacer `HourlyWinrateBar` → template `winrateByHour`
- Remplacer `DayOfWeekPnlChart` → template `pnlByDayOfWeek`
- Supprimer les 2 composants dédiés
- Mettre à jour `defaultGridItemsLg/Md/Sm` dans `dashboard.ts` (remplacer clés anciennes par nouvelles instances)
- Mettre à jour `componentMap` + `chartVisibility` dans `Index.vue`
- Mettre à jour `DashboardVisibilityMenu.vue`

**Fichiers** :
- `utils/dashboard.ts`
- `components/dashboard/Index.vue`
- `components/dashboard/DashboardVisibilityMenu.vue`
- Supprimer : `HourlyWinrateBar.vue`, `DayOfWeekPnlChart.vue`

### Étape 4 : Timezones dans getGroupFn ✅
**Complexité** : Faible

- `hourStart`/`hourEnd`/`dayOfWeek` utilisent `getHourAndWeekdayInUserTimezone` qui nécessite les settings de timezone
- Propager `userStore.settings` dans `getGroupFn` (ou via un composable)
- Vérifier que les résultats sont identiques aux charts spécialisés actuels

**Fichiers** :
- `composables/useAnalytics.ts` (`getGroupFn`)

### Étape 5 : TimeSeriesWidget (nouveau composant) ✅
**Complexité** : Élevée

- Définir `TimeSeriesConfig` dans `type/index.ts`
- Ajouter `'timeSeries'` à `BreakdownBaseKey` (ou nouveau type séparé)
- Créer `TimeSeriesWidget.vue` (similaire à `BreakdownWidget` mais pour séries temporelles)
- Réutiliser `BaseWidgetCard` pour le conteneur
- Implémenter les 4 types de charts :
  - `pnl` : barres verticales (1 trade = 1 barre), maxTrades, tooltip date+account
  - `cumulatedPnl` : line + threshold, startingCapital
  - `appt` : barres + line (MA), couleur vert/rouge
  - `winrate` : barres + line (MA), toggle showBars/showMA, Y 0-100%
- Settings : aggregation (day/week/month), showBars, showMovingAverage, movingAverageWindow
- Persistance via `workspace.breakdownConfigs` (même mécanisme que BreakdownWidget)

**Fichiers** :
- `type/index.ts`
- nouveau `components/dashboard/charts/timeseries/TimeSeriesWidget.vue`
- `composables/metrics/useBreakdownConfig.ts` (ou nouveau `useTimeSeriesConfig.ts`)

### Étape 6 : Templates pour séries temporelles ✅
**Complexité** : Faible

- Ajouter les templates timeSeries dans `useBreakdownConfig.ts`
- Étendre le menu "Ajouter un chart" avec la catégorie séries temporelles

**Fichiers** :
- `composables/metrics/useBreakdownConfig.ts`
- `components/dashboard/DashboardVisibilityMenu.vue`

### Étape 7 : Migration des charts de séries temporelles ✅
**Complexité** : Faible

- Remplacer `PnlBarChartEcharts` → instance de TimeSeriesWidget avec template `pnlByTrade`
- Remplacer `CumulatedPnlChartEcharts` → instance de TimeSeriesWidget avec template `cumulatedPnl`
- Remplacer `ApptChartEcharts` → instance de TimeSeriesWidget avec template `appt`
- Remplacer `WinrateChartEcharts` → instance de TimeSeriesWidget avec template `winrate`
- Supprimer les 4 composants dédiés
- Mettre à jour `defaultGridItemsLg/Md/Sm` + `componentMap` + `DashboardVisibilityMenu`

**Fichiers** :
- `utils/dashboard.ts`
- `components/dashboard/Index.vue`
- `components/dashboard/DashboardVisibilityMenu.vue`
- Supprimer : `PnlBarChartEcharts.vue`, `CumulatedPnlChartEcharts.vue`, `ApptChartEcharts.vue`, `WinrateChartEcharts.vue`

### Étape 8 : Heatmap 2D dans BreakdownWidget ✅
**Complexité** : Élevée

- Ajouter `'heatmap'` à `BreakdownChartType`
- Ajouter `'breakdownHeatmap'` à `BreakdownBaseKey`
- Nouvelle dimension composée : `hourDayOfWeek` (2D)
- Implémenter `heatmapChartOption` dans `BreakdownWidget.vue` (utilise `buildHeatmapSeries` + `buildVisualMap` de `echarts-builders`)
- Adapter `calculateHourlyHeatmapData` pour retourner un format compatible avec BreakdownMetrics ou un format 2D dédié
- Gestion des weekend conditionnel (afficher sam/dim seulement si trades)
- Gestion des timezones (déjà fait étape 4)

**Fichiers** :
- `type/index.ts`
- `components/dashboard/charts/breakdown/BreakdownWidget.vue`
- `composables/useAnalytics.ts`

### Étape 9 : Migration de la heatmap ✅
**Complexité** : Faible

- Remplacer `HourlyPnlHeatmap` → instance de BreakdownWidget avec template `heatmapHourDay`
- Supprimer le composant dédié
- Mettre à jour `defaultGridItemsLg/Md/Sm` + `componentMap` + `DashboardVisibilityMenu`

**Fichiers** :
- `utils/dashboard.ts`
- `components/dashboard/Index.vue`
- `components/dashboard/DashboardVisibilityMenu.vue`
- Supprimer : `HourlyPnlHeatmap.vue`

## Ordre recommandé

| Étape | Complexité | Description | Dépend de |
|-------|-----------|-------------|-----------|
| 1 | Moyenne | `barVertical` dans BreakdownWidget | — | ✅ Fait |
| 2 | Moyenne | Système de templates | Étape 1 | ✅ Fait |
| 3 | Faible | Migration bar charts spécialisés | Étapes 1, 2 | ✅ Fait |
| 4 | Faible | Timezones dans getGroupFn | — | ✅ Fait |
| 5 | **Élevée** | `TimeSeriesWidget` (nouveau composant) | Étape 2 | ✅ Fait |
| 6 | Faible | Templates séries temporelles | Étape 5 | ✅ Fait |
| 7 | Faible | Migration charts séries temporelles | Étapes 5, 6 | ✅ Fait |
| 8 | **Élevée** | Heatmap 2D dans BreakdownWidget | Étape 4 | ✅ Fait |
| 9 | Faible | Migration heatmap | Étape 8 | ✅ Fait |
| 10 | Moyenne | Séries temporelles en mode avancé | Étapes 5, 6 | ✅ Fait |

### Étape 10 : Séries temporelles en mode avancé ✅
**Complexité** : Moyenne
**Statut** : ✅ Fait

Actuellement les 4 templates de séries temporelles (P&L par Trade, P&L Cumulé, APPT, Winrate) sont dans la catégorie "Séries temporelles" avec une métrique fixe. L'utilisateur ne peut pas changer la métrique depuis le chart — il doit créer un nouveau template.

L'objectif est de rendre le `TimeSeriesWidget` pleinement configurable depuis le header (comme les breakdowns avec leur dropdown dimension/métrique), et d'ajouter un template "Série temporelle personnalisée" dans la catégorie "Avancé".

**2 types de chart disponibles en mode avancé** :

Le template "Série temporelle personnalisée" donne accès aux 2 types de chart via le dropdown de métrique dans le header. L'utilisateur n'a pas à choisir le type de chart directement — il est déterminé automatiquement par la métrique sélectionnée :

1. **Barres + moyenne mobile** (`pnl`, `appt`, `winrate`) — barres verticales pour les valeurs de chaque période, avec une courbe de moyenne mobile (MA) optionnelle par-dessus (toggle `showMovingAverage`, fenêtre configurable). Pour `pnl` (par trade), pas d'agrégation et la MA est désactivée par défaut.
2. **Area chart** (`cumulatedPnl`) — courbe remplie bicolore (equity curve) : vert au-dessus du seuil (starting capital), rouge en-dessous, zone remplie avec transparence. Ligne de threshold (markLine) si starting capital > 0. Points de croisement calculés pour transition continue entre les couleurs.

Le type de chart n'est pas choisi par l'utilisateur — il est déterminé par la métrique sélectionnée dans le dropdown du header.

**Changements** :

1. **Ajouter un dropdown de métrique dans le header du `TimeSeriesWidget`**
   - Le header affiche un select avec les 4 métriques : `pnl`, `cumulatedPnl`, `appt`, `winrate`
   - Permet de changer la métrique à la volée sans recréer une instance
   - Le type de chart s'adapte automatiquement (barres+MA ou area chart)
   - Les settings s'adaptent automatiquement (ex: `maxTrades` seulement pour `pnl`, `showThreshold` seulement pour `cumulatedPnl`, `showMovingAverage` seulement pour `appt`/`winrate`)

2. **Ajouter 2 templates dans Avancé** (un par type de chart, comme les breakdowns) :
   ```ts
   // Barres + moyenne mobile personnalisé
   { id: 'customBarMA', labelKey: 'components.dashboard.templates.custom_bar_ma', category: 'advanced', baseKey: 'timeSeries', config: { metric: 'appt', chartType: 'timeSeries', aggregation: 'week', showBars: true, showMovingAverage: true, movingAverageWindow: 5, yAxisFormat: 'currency', crosshairType: 'cross' } }

   // Area chart personnalisé
   { id: 'customAreaChart', labelKey: 'components.dashboard.templates.custom_area_chart', category: 'advanced', baseKey: 'timeSeries', config: { metric: 'cumulatedPnl', chartType: 'timeSeries', aggregation: 'week', showThreshold: true, yAxisFormat: 'currency', crosshairType: 'cross' } }
   ```
   - **Barres + MA personnalisé** : crée un `TimeSeriesWidget` avec métrique `appt` par défaut (barres + MA). L'utilisateur change la métrique via le dropdown (pnl, appt, winrate).
   - **Area chart personnalisé** : crée un `TimeSeriesWidget` avec métrique `cumulatedPnl` par défaut (area chart bicolore). L'utilisateur change la métrique via le dropdown.
   - Les paramètres (agrégation, MA, threshold, crosshair) se configurent via le menu settings
   - Symétrie avec les templates breakdown avancés : Barres personnalisé, Barres verticales personnalisé, Nuage personnalisé, Tableau personnalisé

3. **Supprimer la catégorie "Séries temporelles" et les 4 templates spécifiques**
   - Les templates `pnlByTrade`, `cumulatedPnl`, `appt`, `winrate` ne sont plus nécessaires
   - Les 2 templates avancés suffisent — l'utilisateur choisit la métrique via le dropdown du header
   - Le type de chart (barres+MA ou area chart) est déterminé par le template choisi, puis s'adapte à la métrique
   - Supprimer la catégorie "Séries temporelles" du `DashboardVisibilityMenu`

4. **i18n**
   - Ajouter `components.dashboard.templates.custom_bar_ma` et `components.dashboard.templates.custom_area_chart` dans `en.js` et `fr.js`
   - Label pour le dropdown de métrique : `components.dashboard.breakdown.metric` (déjà existant)

**Fichiers** :
- `components/dashboard/charts/timeseries/TimeSeriesWidget.vue` — ajout dropdown métrique dans le header
- `composables/metrics/useBreakdownConfig.ts` — ajout templates `customBarMA` + `customAreaChart`, suppression des 4 templates spécifiques
- `i18n/locales/en.js` + `i18n/locales/fr.js` — nouvelle clé de traduction

**Résultat** :
- L'utilisateur crée une série temporelle from scratch (Avancé → Barres+MA personnalisé ou Area chart personnalisé)
- Choisit la métrique (pnl, cumulatedPnl, appt, winrate) depuis le chart via le dropdown
- Le type de chart est déterminé par le template choisi, puis s'adapte à la métrique
- Configure tous les paramètres via le menu settings
- Plus besoin de templates spécifiques par métrique — 2 templates génériques suffisent
- Symétrie avec les breakdowns avancés (Barres, Barres verticales, Nuage, Tableau personnalisé)

## Points d'attention

### Spécificités par chart à préserver

- **PnL par Trade** : pas d'agrégation, 1 barre = 1 trade, maxTrades configurable (default 50), tooltip avec date + account, tri par closeDate
- **PnL Cumulé** : area chart bicolore (equity curve) avec threshold (startingCapital), vert au-dessus/rouge en-dessous, zone remplie, agrégation day/week/month
- **APPT** : barres + courbe MA (moving average window=5), couleur vert/rouge selon valeur, agrégation
- **Winrate** : barres + courbe MA, toggle showBars/showMovingAverage, Y axis 0-100%, format %, MA window=3, agrégation
- **Heatmap** : 2 dimensions configurables (X × Y), métrique au choix, tooltip metrics, visualMap symétrique (-max → +max), couleurs orange/ambre

### Migration des settings

Pas de migration auto — l'utilisateur fera un "Reset layout" qui créera les instances depuis les templates avec les valeurs par défaut. Les anciens settings dans `dbStateStore.chartSettings` seront simplement ignorés (pas de conversion nécessaire).

### Composants de base réutilisables

- `BaseWidgetCard.vue` — conteneur avec header, settings, enlarge
- `CartesianChart.vue` — base pour barres verticales + line (utilisé par les charts actuels)
- `HeatmapChart.vue` — base pour heatmap
- `CumulatedLineChart.vue` — base pour line avec threshold
- `echarts-builders.ts` — `buildBarSeries`, `buildBarData`, `buildBarColors`, `buildScatterSeries`, `buildHeatmapSeries`, `buildVisualMap`

### Tests

- Vérifier que chaque chart migré produit un rendu identique au composant spécialisé qu'il remplace
- Tester les settings (aggregation, showBars, showMA) persistent correctement
- Tester la création/destruction d'instances depuis les templates

### Performance et caching

Principe : minimiser les calculs de données en utilisant le cache au maximum. Un seul calcul par clé de cache, partagé entre toutes les instances.

- **Séries temporelles — agrégation** : `useAggregationCache` existe déjà — cache `groupTradesByPeriod` par mode (day/week/month). Invalidation auto quand `lastTrades`, `displayModeNet` ou `settingsObject` changent. **Rien à faire.**
- **Séries temporelles — données finales** : ajouter un cache par `(metric, aggregation, displayModeNet)` pour `generateCumulatedPnlChartData` / `generateApptChartData` / `generateWinrateChartData`. Évite de refaire le reduce à chaque rendu. Invalidation auto comme `useAggregationCache`.
- **Breakdowns** : ajouter un cache par `(dimension, displayModeNet)` pour `calculateMetricsByDimension`. `calculateMetricsByDimension` calcule toutes les métriques d'un coup (pnl, winrate, profitFactor, avgWin, avgLoss, etc.) — un seul calcul par dimension, partagé entre toutes les instances qui l'utilisent, chaque instance n'affiche que celles qui l'intéressent. Invalidation auto sur `lastTrades` / `displayModeNet` / `settingsObject`.
- **Heatmap** : ajouter un cache par settings de timezone pour `calculateHourlyHeatmapData` (24×7 cellules). Invalidation auto sur `lastTrades` / `settingsObject`.

Tous les caches suivent le même pattern que `useAggregationCache` : `Map` en mémoire, invalidation auto via `watch` sur `lastTrades` / `displayModeNet` / `settingsObject`.

### i18n

Nouvelles clés de traduction à ajouter dans `en.js` et `fr.js` :
- Labels des templates (ex: `components.dashboard.templates.pnl_by_ticker`)
- Catégories de templates (ex: `components.dashboard.templates.categories.breakdown`)
- Nouveaux settings (ex: `components.dashboard.common.aggregation`, déjà existant)
- Labels des nouveaux types de charts (ex: `components.dashboard.charts.breakdown_bar_vertical`)

### Reset layout

Le bouton "Reset layout" doit maintenant :
1. Supprimer toutes les instances existantes
2. Créer les instances par défaut depuis les templates (au lieu d'utiliser les anciennes clés fixes)
3. Appliquer les positions par défaut depuis `defaultGridItemsLg/Md/Sm`

### Sync workspaces

`syncActiveWorkspaceToOtherDatabases` et `syncDashboardToOtherDatabases` doivent gérer :
- Les nouvelles clés d'instances (déjà génériques, pas de changement nécessaire)
- Les `breakdownConfigs` par instance (déjà synchronisées)
- Vérifier que les templates existent dans la DB cible (les templates sont statiques, pas de problème)

### Extension du type BreakdownConfig

Le type `BreakdownConfig` dans `type/index.ts` doit être étendu pour inclure les paramètres spécifiques :

```ts
export interface BreakdownConfig {
  dimension: BreakdownDimension
  metric: BreakdownMetric
  chartType: BreakdownChartType
  filter?: { topN?: number }
  columns?: BreakdownMetric[]
  tooltipMetrics?: BreakdownMetric[]
  // Nouveaux params pour barVertical / heatmap
  yAxisFormat?: 'currency' | 'percent' | 'number'
  yAxisMin?: number
  yAxisMax?: number
  showWeekend?: boolean
  // Nouveaux params pour timeSeries
  aggregation?: 'day' | 'week' | 'month'
  showBars?: boolean
  showMovingAverage?: boolean
  movingAverageWindow?: number
  maxTrades?: number
  showThreshold?: boolean
}
```
