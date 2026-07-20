# Inventaire des métriques de trading

Liste exhaustive des métriques qu'on trouve dans les logiciels de trading (TradeStation, MT5, TradingView, journaux de trading type Pineify/PnLpad/PropScorer, etc.), avec mention de l'état d'implémentation dans PnlTracker.

Sources : recherches web (TorchTrade, Pineify, PnLpad, PropScorer, QuantifiedStrategies, TradingWyckoff, Alpha Charts, FX Foundations, ForexMechanics, TradersSecondBrain) + inventaire du code PnlTracker (`utils/tradeStats.ts`, `utils/dayStats.ts`, `composables/useAnalytics.ts`, `composables/useDashboard.ts`, `schema/trade.ts`).

Légende :
- ✅ Implémenté dans PnlTracker
- ❌ Manquant
- ⚠️ Partiel / à vérifier

---

## 1. Rentabilité (Profitability)

> Principe : chaque métrique en €/devise doit aussi pouvoir être exprimée en **R** (R-multiple), c'est-à-dire normalisée par le risk initial prévu du trade. Cela permet de comparer des trades de tailles différentes et de raisonner en unités de risque plutôt qu'en montant absolu. Si le planned risk n'est pas renseigné pour un trade, la version R n'est pas calculée pour ce trade.
>
> **Prérequis schéma** : le schéma actuel (`schema/trade.ts`) n'a pas de champ `plannedRisk` (montant risqué en devise). Il a `stopLoss` (prix) et `takeProfit` (prix). Pour calculer le R-multiple il faut donc soit :
> - **Option A** : ajouter un champ `plannedRisk: z.number().nullable()` au schéma (montant en devise, saisi par l'utilisateur ou importé)
> - **Option B** : calculer le risk à partir de `stopLoss` + prix d'entrée + taille de position : `|entryPrice − stopLoss| × quantity`
>
> Option A recommandée (plus simple, plus fiable, ne dépend pas de la disponibilité du prix d'entrée). À valider avant implémentation.

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Total P&L (net / brut) | ✅ | `getPNL()` — `utils/tradeStats.ts:4` | Somme des profits/pertes |
| **Total P&L en R** (cumul R) | ❌ | — | Somme des R-multiples — performance totale en unités de risque |
| Total Commission | ✅ | inline — `composables/useDashboard.ts:120` | Somme des commissions |
| Average Profit Per Trade (APPT) | ✅ | `getAPPT()` — `utils/tradeStats.ts:11` | Profit moyen par trade |
| **APPT en R** (expectancy en R) | ❌ | — | R moyen par trade — seuil de viabilité: >+0.3R pour A+ setups (Van Tharp) |
| Win Rate | ✅ | `getWinrate()` — `utils/tradeStats.ts:33` | % de trades gagnants |
| Profit Factor | ✅ | `getProfitFactor()` — `utils/tradeStats.ts:86` | Profit brut / perte brute (formule MT5) |
| **Profit Factor en R** | ❌ | — | Somme des R gagnants / |somme des R perdants| — version normalisée du PF |
| Expectancy | ✅ | `getExpectancy()` — `utils/tradeStats.ts:227` | (Win% × Avg Win) − (Loss% × Avg Loss) |
| P/L Ratio | ✅ | `getPLRatio()` — `utils/tradeStats.ts:21` | Gain moyen / perte moyenne |
| **P/L Ratio en R** | ❌ | — | R moyen gagnant / |R moyen perdant| |
| Total Profit / Total Loss | ✅ | `getWinningTradesMetrics` / `getLosingTradesMetrics` | Sommes des gains / pertes |
| **Total Profit / Loss en R** | ❌ | — | Sommes des R gagnants / perdants |
| Average Win / Average Loss | ✅ | idem | Gain / perte moyenne |
| **Average Win / Loss en R** | ❌ | — | R moyen gagnant / perdant |
| Largest Win / Largest Loss | ✅ | idem | Meilleur / pire trade |
| **Largest Win / Loss en R** | ❌ | — | Meilleur / pire trade en unités de risque |
| Total / Winning / Losing / Breakeven trades | ✅ | `getWinningTradesMetrics`, `getLosingTradesMetrics`, `getBreakevenTradesMetrics` | Comptages |
| R-Multiple par trade | ❌ | — | PnL / planned risk — base de toutes les versions R ci-dessus |
| ROI / Return on Investment | ❌ | — | % de retour sur capital |

> Kelly Criterion et Risk of Ruin écartés — nécessitent des hypothèses statistiques fortes et une taille de position variable, peu utiles pour un tracker de journal.

---

## 2. Ratios risque-rendement (Risk-Adjusted)

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Sharpe Ratio | ✅ | `getSharpeRatio()` — `utils/tradeStats.ts:151` | (Rendement moyen − taux sans risque) / écart-type, annualisé |
| Recovery Factor | ✅ | `getRecoveryFactor()` — `utils/tradeStats.ts:116` | Profit net / max drawdown |
| Sortino Ratio | ❌ | — | Variante Sharpe ne pénalisant que la volatilité négative — souvent préféré par les traders |
| Calmar Ratio | ❌ | — | CAGR / Max Drawdown (sur 36 mois glissants) |
| SQN (System Quality Number) | ❌ | — | `√N × Mean(R) / StdDev(R)` — Van Tharp, nécessite ≥30 trades |
| Ulcer Index | ❌ | — | `sqrt(mean(drawdown²))` — profondeur × durée des drawdowns |

> Métriques de portefeuille/fonds **non pertinentes** pour un tracker de trading personnel (nécessitent un benchmark marché, calcul complexe, peu de valeur ajoutée) : MAR, UPI, Omega, Sterling, Burke, K-Ratio, Treynor, Jensen's Alpha, Information Ratio. Écartées volontairement.

---

## 3. Drawdown

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Max Drawdown (+ dates) | ✅ | `getMaxDrawdownWithDates()` — `utils/tradeStats.ts:395` | Drawdown max avec dates début/fin |
| Average Drawdown (abs / %) | ✅ | `getAverageDrawdown()` / `getAverageDrawdownPercent()` — `utils/dayStats.ts:113` | Drawdown moyen |
| Daily Max Drawdown | ✅ | `getDailyMaxDrawdownWithPercent()` — `utils/dayStats.ts:88` | Max drawdown journalier |
| Max Run-up (+ dates) | ✅ | `getMaxRunUpWithDates()` — `utils/tradeStats.ts:437` | Plus forte hausse |
| Drawdown Duration | ❌ | — | Temps passé sous le peak |
| Recovery Time | ❌ | — | Temps pour récupérer du max DD |
| Max DD Duration | ❌ | — | Durée de la plus longue période de drawdown |

> Underwater Curve = visualisation (voir section 10), pas une métrique.

---

## 4. Consistance & distribution

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Max Winning Streak | ✅ | `getMaxWinningStreak()` — `utils/tradeStats.ts:353` | Plus longue série de trades gagnants |
| Max Losing Streak | ✅ | `getMaxLosingStreak()` — `utils/tradeStats.ts:374` | Plus longue série de trades perdants |
| Standard Deviation (win / loss) | ✅ | `getStdDev()` — `utils/tradeStats.ts:248` | Écart-type des gains / pertes |
| Skewness | ❌ | — | Asymétrie de la distribution des rendements |
| Kurtosis | ❌ | — | Aplatissement (fat tails) |

> Z-Score, Consistency Score, Coefficient of Variation écartés — niche / académique, peu de valeur pour un trader actif.

---

## 5. Durée & temps

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Average Trade Duration | ✅ | `getAvgTradeDuration()` — `utils/tradeStats.ts:188` | Durée moyenne en minutes |
| Max Trade Duration | ✅ | `getMaxTradeDuration()` — `utils/tradeStats.ts:207` | Durée max en minutes |
| Average Win / Loss Duration | ✅ | `getWinningTradesMetrics` / `getLosingTradesMetrics` | Durée moyenne par issue |
| Max Win / Loss Duration | ✅ | idem | Durée max par issue |
| Average Hold Time (Scratch/Breakeven) | ⚠️ | À vérifier | Mentionné dans `docs/dev/new-metrics.md` |

> Time in Market et Average Holding Period by Symbol écartés — faible valeur ajoutée pour un journal de trading.

---

## 6. Statistiques journalières

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Total Trading Days | ✅ | `getTotalTradingDays()` — `utils/dayStats.ts:20` | Nombre total de jours de trading |
| Winning / Losing / Breakeven Days | ✅ | `utils/dayStats.ts:22-26` | Comptages |
| Max Consecutive Winning / Losing Days | ✅ | `utils/dayStats.ts:28-54` | Plus longues séries |
| Average Daily PnL | ✅ | `getAverageDailyPnl()` — `utils/dayStats.ts:56` | PnL journalier moyen |
| Average Winning / Losing Day PnL | ✅ | `utils/dayStats.ts:62-74` | PnL moyen par type de jour |
| Largest Profitable / Losing Day | ✅ | `utils/dayStats.ts:76-86` | Meilleur / pire jour |
| Stats mensuelles (best/lowest/avg month) | ❌ | — | Visible dans `docs/dev/new-metrics.md` |
| Stats hebdomadaires / annuelles | ❌ | — | Agrégations par période |

> Open Trades retiré (`closeDate` obligatoire — voir `docs/dev/new-metrics.md`). Logged Days écarté (nécessiterait un suivi des jours d'ouverture de l'app, hors périmètre).

---

## 7. Par dimension (Breakdowns)

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Metrics by Ticker | ✅ | `calculateMetricsByTicker()` — `composables/useAnalytics.ts:20` | PnL, winrate, profit factor, avg win/loss, avg duration, avg MAE/MFE par symbole |
| Metrics by Hour | ✅ | `calculateMetricsByHour()` — `composables/useAnalytics.ts:128` | Métriques par heure de la journée |
| Hourly Heatmap (hour × day of week) | ✅ | `calculateHourlyHeatmapData()` — `composables/useAnalytics.ts:191` | Heatmap PnL/winrate |
| Metrics by Day of Week | ⚠️ | Partiellement via heatmap | Pas de breakdown dédié |
| Metrics by Month | ❌ | — | Performance par mois calendaire |
| Metrics by Side (Long/Short) | ❌ | — | Performance long vs short |

> Breakdowns écartés (nécessitent des champs non présents dans le schéma actuel) : Setup/Tag, Session (Asie/Europe/US), Strategy, A/B/C class. Pourront être ajoutés plus tard si ces champs sont introduits dans `schema/trade.ts`.

---

## 8. MAE / MFE (Adverse / Favorable Excursion)

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| MAE / MFE stockés par trade | ✅ | `schema/trade.ts:132-133` | Champs `mae` / `mfe` nullables |
| Average MAE / MFE par ticker | ✅ | inline — `composables/useAnalytics.ts:75-81` | Moyennes par symbole |
| MAE / MFE Ratio | ❌ | — | Qualité des entrées (MFE / MAE) |

> Métriques MAE/MFE avancées (at exit, distribution analysis, MFE capture %, MAE vs final outcome) écartées pour l'instant — reviendront plus tard si besoin. On garde les bases : stockage, moyenne par ticker, ratio.

---

## 9. Autres

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Total Contracts / Lots | ✅ | `getTotalContracts()` — `utils/tradeStats.ts:263` | Somme des volumes |
| Moving Average | ✅ | `movingAverage()` — `utils/tradeStats.ts:57` | Moyenne mobile sur série |
| Group Trades by Period | ✅ | `groupTradesByPeriod()` — `utils/dashboard.ts` | Regroupement temporel |
| Average Daily Volume | ⚠️ | À vérifier | Mentionné dans `docs/dev/new-metrics.md` |
| Equity Curve | ✅ | — | Courbe de capital cumulé |

> Monte Carlo Drawdown, Buy & Hold Return, Benchmark vs marché, VaR, CVaR écartés — nécessitent un benchmark marché ou des simulations statistiques hors périmètre d'un journal de trading.

---

## Recommandations prioritaires

Métriques les plus citées comme "indispensables" dans la littérature et **manquantes** dans PnlTracker, par ordre de priorité :

1. **Sortino Ratio** — complément naturel du Sharpe déjà présent, préféré par les traders car ne pénalise pas les gains
2. **R-Multiple & expectancy en R** — métrique n°1 selon Van Tharp / PropScorer, normalise entre trades
3. **Calmar Ratio** — rendement par unité de drawdown (complément du Recovery Factor)
4. **SQN (Van Tharp)** — qualité globale du système, combine expectancy + consistance + opportunités
5. **Stats mensuelles** (best/lowest/avg month) — déjà listées dans `docs/dev/new-metrics.md`
6. **Drawdown duration / recovery time** — complément du max DD
7. **MAE / MFE Ratio** — qualité des entrées (les champs sont déjà stockés, juste le ratio à calculer)

> Métriques écartées comme non pertinentes pour un tracker de trading personnel : MAR, UPI, Omega, Sterling, Burke, K-Ratio, Treynor, Jensen, Information Ratio, Z-Score, Consistency Score, Coefficient of Variation, MAE/MFE avancées (at exit, distribution, capture %), Monte Carlo, VaR/CVaR, Buy & Hold benchmark. Raisons : nécessitent un benchmark marché, calcul complexe pour faible valeur ajoutée, ou académiques.

### Seuils couramment cités pour évaluer un système

| Métrique | Mauvais | Marginal | Bon | Excellent |
|---|---|---|---|---|
| Profit Factor | < 1.0 | 1.0–1.2 | 1.5–2.0 | > 2.0 |
| Sharpe Ratio | < 0.5 | 0.5–1.0 | 1.0–2.0 | > 2.0 |
| Sortino Ratio | < 1.0 | 1.0–1.5 | 1.5–2.0 | > 2.0 |
| Calmar Ratio | < 0.5 | 0.5–1.0 | 1.0–2.0 | > 2.0 |
| SQN | < 1.6 | 1.6–2.0 | 2.0–2.5 | > 2.5 |
| Max Drawdown | > 30% | 20–30% | 10–20% | < 10% |
| Recovery Factor | < 1.0 | 1.0–2.0 | 2.0–3.0 | > 3.0 |
| Expectancy (R) | < 0 | 0–0.15R | 0.15–0.3R | > 0.3R |

---

## 10. Types de graphiques (visualisations)

Liste des types de graphiques utilisés dans les logiciels de trading, restreinte aux **types supportés nativement par ApexCharts** (`chart.type`).

> Note : PnlTracker utilise actuellement ECharts, pas ApexCharts. Cette section liste les types ApexCharts qui pourraient être utilisés pour visualiser les métriques ci-dessus. Source : https://apexcharts.com/docs/chart-types/

### ApexCharts — types natifs disponibles

| `chart.type` | Type de graphique | Usage typique en trading |
|---|---|---|
| `line` | Ligne | Equity curve, P&L cumulé, courbe de drawdown, moyennes mobiles |
| `area` | Aire | Equity curve avec zone remplie, P&L cumulé, underwater curve |
| `rangeArea` | Aire avec plage | Bandes de volatilité, intervalles de confiance, range equity |
| `bar` (horizontal) | Barres horizontales | Comparaison par catégorie (ticker, setup, session, jour de semaine) |
| `bar` (vertical = column) | Colonnes | P&L par jour / mois / année, distribution par classe |
| `rangeBar` | Barres à plage | Timeline de trades (entrée → sortie), périodes de drawdown |
| `scatter` | Nuage de points | R-multiple vs durée, MAE vs MFE, risk/reward par trade |
| `bubble` | Bulles | 3 variables : ex. P&L (y) × durée (x) × taille position (z) |
| `heatmap` | Heatmap | P&L par heure × jour, activité calendaire (type GitHub) |
| `candlestick` | Bougies | OHLC d'un instrument (données marché, pas PnL tracker) |
| `boxPlot` | Boîte à moustaches | Distribution des R-multiples, P&L par setup (quartiles) |
| `violin` | Violon | Forme de la distribution des rendements (densité) |
| `pie` | Camembert | Répartition long/short, par side, par type d'ordre |
| `donut` | Donut | Idem pie avec label central (win/loss %, profit factor) |
| `polarArea` | Aire polaire | Répartition par session / symbole avec poids visuel |
| `radialBar` | Barre radiale | Score unique : win rate, expectancy, profit factor (jauge) |
| `gauge` | Jauge | Métrique unique avec seuils (Sharpe, max DD) |
| `radar` | Radar | Profil de performance multi-axes (win rate, PF, expectancy, Sharpe, Calmar) |
| `treemap` | Treemap | P&L par symbole proportionnel à la taille, hiérarchie ticker → setup |
| `funnel` | Entonnoir | Funnel de trades : idées → setups → exécutés → gagnants |
| `pyramid` | Pyramide | Hiérarchie de classification (A/B/C setups) |
| Mixed | Combiné | Equity curve (line) + volume (column) ; P&L cumulé + drawdown |

### Mapping métrique → graphique ApexCharts recommandé

| Métrique / concept | Type ApexCharts | Notes |
|---|---|---|
| Equity curve / P&L cumulé | `area` ou `line` | Le plus important — vision haut niveau |
| Drawdown / underwater curve | `area` (négative) | Zone sous zéro, met en évidence la "douleur" |
| P&L par jour | `bar` (column) | Vert/rouge selon signe |
| P&L par mois / année | `bar` (column) | Idem |
| P&L par ticker / setup | `bar` (horizontal) | Labels longs → horizontal |
| Win/loss ratio | `donut` ou `pie` | Avec % au centre |
| Win rate | `radialBar` ou `gauge` | Jauge 0–100% |
| Profit factor / Sharpe / Calmar | `gauge` | Jauge avec seuils colorés |
| Profil de performance global | `radar` | Multi-axes : win rate, PF, expectancy, Sharpe, Calmar, SQN |
| Distribution des R-multiples | `boxPlot` ou `bar` (histogramme) | Voir les fat tails, skew |
| Distribution des rendements | `violin` ou `boxPlot` | Forme de la distribution |
| R-multiple vs durée | `scatter` | Corrélation temps/rendement |
| MAE vs MFE | `scatter` | Qualité des entrées |
| P&L vs taille position vs durée | `bubble` | 3 dimensions |
| Heatmap P&L heure × jour | `heatmap` | Déjà existant côté ECharts |
| Calendrier de trading | `heatmap` | Type GitHub contributions |
| Timeline des trades | `rangeBar` | Entrée → sortie par trade |
| P&L par symbole (taille relative) | `treemap` | Hiérarchique |
| Long vs short | `polarArea` ou `donut` | Répartition directionnelle |
| Funnel d'idées → trades gagnants | `funnel` | Si tracking des setups envisagés |

### État actuel PnlTracker (ECharts)

Pour référence, PnlTracker utilise actuellement ECharts avec ces types :
- `line` — courbes (equity, APPT, winrate, etc.)
- `bar` — barres verticales/horizontales (P&L par ticker, jour, heure)
- `scatter` — nuages de points
- `heatmap` — heatmap heure × jour
- `pie` — win/loss

Si migration vers ApexCharts : tous ces types sont supportés nativement, plus `area`, `rangeBar`, `boxPlot`, `violin`, `radar`, `radialBar`, `gauge`, `treemap`, `bubble`, `polarArea` qui ouvriraient de nouvelles visualisations (profil radar, jauges, distributions R-multiple, timeline de trades).

---

## 11. Duplication + reparamétrage de charts

Besoin : pouvoir **dupliquer un chart existant** et **changer ses paramètres** (métrique affichée, dimension, agrégation, etc.) indépendamment de l'original. Permet à l'utilisateur de créer des vues personnalisées sans modifier les charts par défaut.

### Architecture actuelle

PnlTracker a déjà une base solide mais conçue pour "un chart par type" — pas pour des instances multiples.

#### ✅ Ce qui existe

| Élément | Fichier | Rôle |
|---|---|---|
| Slot `#settings` par chart | `components/dashboard/charts/base/BaseEchartsCard.vue:9-21` | Popover de config avec icône engrenage |
| Store de settings par chart | `stores/dbState.ts:480-492` (`chartSettingsPerDb`) | `Record<chartId, Record<setting, value>>` persisté |
| Grille drag-and-drop | `components/dashboard/GridLayout.vue` + `utils/dashboard.ts:14-66` | `vue-grid-layout-v3`, layouts par breakpoint (lg/md/sm) |
| Workspaces multiples | `components/dashboard/Index.vue:130-286` | Onglets, max 5, layout + visibilité par workspace |
| Menu de visibilité | `components/dashboard/DashboardVisibilityMenu.vue` | Show/hide par chart et par breakpoint |
| Registry de charts | `composables/metrics/useChartRegistry.ts:9-19` | Liste des `ChartKey` avec `category` et `defaultVisible` |
| Persistance localStorage | `stores/dbState.ts:632-653` | Pinia persist sur `dashBoardFiltersPerDb`, `chartSettingsPerDb` |
| Multi-database | `stores/dbState.ts` | Toutes les configs sont stockées par `dbName` dans des `*PerDb` |
| Cache d'agrégation | `composables/useAggregationCache.ts` | Mémoïse les trades groupés par day/week/month |

#### Exemples de settings déjà implémentés

| Chart | Settings | Stockage |
|---|---|---|
| `CumulatedPnlChartEcharts` | `cumuleMode` (day/week/month) | `chartSettings['cumulatedPnl'].cumuleMode` |
| `WinrateChartEcharts` | `cumuleMode`, `showBars`, `showMovingAverage` | `chartSettings['winrate']` |
| `ApptChartEcharts` | `cumuleMode` | `chartSettings['appt'].cumuleMode` |

Charts **sans** settings aujourd'hui : `PnlBarChartEcharts`, `WinLossPieChartEcharts`, tous les charts `ticker/*`, `IntradayPnlChart`.

### ❌ Ce qui manque pour la duplication + reparamétrage

| # | Manque | Impact | Solution proposée |
|---|---|---|---|
| 1 | **Identifiant d'instance** — `ChartKey` identifie le TYPE (`'cumulatedPnl'`), pas l'instance | Impossible d'avoir 2 instances du même chart avec des params différents | Ajouter `instanceId` (ex: `'cumulatedPnl-1'`, `'cumulatedPnl-2'`) |
| 2 | **Settings par instance dans le layout** — `DashboardGridItem = {x, y, w, h, i}` n'a pas de champ settings | Les settings sont globaux par ChartKey, partagés entre toutes les instances | Étendre en `{x, y, w, h, i, instanceId, settings}` |
| 3 | **Générateur d'ID d'instance** | Pas d'utilitaire pour créer des IDs uniques | `uuid()` ou counter incrémental |
| 4 | **UI "Dupliquer"** sur chaque chart | L'utilisateur ne peut pas cloner un chart | Bouton duplicate dans `BaseEchartsCard` à côté de l'engrenage settings |
| 5 | **Mapping instance → composant + settings** — `gridComponents` mappe `ChartKey → Component` | Le layout ne sait pas quels settings passer à quelle instance | Mapping `instanceId → {component, settings}` |
| 6 | **Registry étendue avec schéma de settings** — la registry actuelle n'a que `id`, `category`, `defaultVisible` | Pas de description des settings possibles par chart | Ajouter `settingsSchema` + `defaultSettings` par chart |
| 7 | **Fusion des settings global/instance** | Conflit entre `chartSettingsPerDb` (global) et settings d'instance | Settings d'instance override les globaux ; fallback sur global si non défini |
| 8 | **UI de reparamétrage dynamique** | Pas de formulaire générique basé sur le schéma | Composant `ChartSettingsModal` piloté par `settingsSchema` |
| 9 | **Suppression d'instance** | Pas de bouton remove + nettoyage des settings associés | Bouton remove sur chaque instance + cleanup |
| 10 | **Migration des layouts existants** | Les layouts actuels utilisent `i = ChartKey` sans `instanceId` | Script de migration : `i → instanceId`, settings globaux → settings d'instance |

### Schéma de données proposé

```typescript
// type/index.ts
interface DashboardGridItem {
	x: number
	y: number
	w: number
	h: number
	i: string              // ChartKey (type de chart) — gardé pour compat
	instanceId: string     // Nouveau : identifiant unique d'instance
	settings?: Record<string, unknown>  // Nouveau : settings propres à l'instance
}

interface ChartDefinition {
	id: ChartKey
	component: Component
	category: 'main' | 'ticker'
	defaultVisible: boolean
	settingsSchema: Record<string, SettingDefinition>  // Nouveau
	defaultSettings: Record<string, unknown>            // Nouveau
}

interface SettingDefinition {
	type: 'select' | 'boolean' | 'number' | 'string'
	label: string
	options?: { value: string; label: string }[]  // pour 'select'
	default: unknown
}
```

### Exemple de flow utilisateur

1. L'utilisateur ouvre le menu d'un chart `CumulatedPnl` (engrenage)
2. Il voit un bouton **"Dupliquer"** à côté des settings existants
3. Il clique → une nouvelle instance `cumulatedPnl-2` est créée à côté dans la grille
4. La nouvelle instance hérite des settings de l'originale
5. L'utilisateur ouvre les settings de la nouvelle instance, change `cumuleMode` → `month` (l'original reste en `week`)
6. Les deux charts sont visibles simultanément, indépendants
7. L'utilisateur peut supprimer l'instance dupliquée sans affecter l'originale

### Recommandations d'implémentation

1. **Étendre `DashboardGridItem`** avec `instanceId` et `settings`
2. **Créer une `ChartInstanceRegistry`** qui mappe `instanceId → {chartKey, settings}`
3. **Ajouter bouton duplicate** dans `BaseEchartsCard` (à côté de l'engrenage)
4. **Créer `ChartSettingsModal`** générique piloté par `settingsSchema`
5. **Mettre à jour `GridLayout`** pour passer les settings d'instance au composant
6. **Étendre la persistance** pour stocker instances + settings par workspace
7. **Script de migration** des layouts existants (un chart par type → instances uniques)

### Lien avec les métriques

Une fois ce système en place, chaque instance de chart peut pointer sur **n'importe quelle métrique** de l'inventaire ci-dessus. Le chart paramétré devient :

```
Chart instance
├── chartType (line / bar / area / scatter / heatmap / ...)
├── dimension (ticker / hour / day / week / month / setup / session / side)
├── metric (pnl / winrate / profitFactor / expectancy / rMultiple / sharpe / ...)
├── aggregation (day / week / month)
└── displayOptions (showBars / showMA / showLabels / ...)
```

C'est là que les **nombreuses métriques** deviennent utiles : elles ne sont plus "un chart par métrique" mais "un chart paramétrable qui peut afficher n'importe quelle métrique". La quantité de métriques devient alors un atout (richesse du sélecteur) plutôt qu'une surcharge de composants.

---

## 12. Prêt pour implémentation

### Points à valider avant de commencer

| # | Décision | Options | Recommandation |
|---|---|---|---|
| 1 | **Planned risk pour R-multiples** | A) Nouveau champ `plannedRisk` dans `schema/trade.ts` / B) Calcul depuis `stopLoss` + entry + qty | Option A (champ explicite, plus fiable) |
| 2 | **ROI / Return on Investment** (section 1) | À implémenter ou écarter | À implémenter — simple (% retour sur capital), nécessite de connaître le capital initial |
| 3 | **Stats hebdomadaires / annuelles** (section 6) | À implémenter ou écarter | À implémenter en même temps que les stats mensuelles (même mécanisme d'agrégation) |
| 4 | **Lib de charts** | Rester sur ECharts ou migrer vers ApexCharts | Décision séparée — les métriques sont indépendantes de la lib de chart |
| 5 | **Average Daily Volume** (section 9, ⚠️) | Vérifier si déjà calculé | À vérifier dans le code avant implémentation |
| 6 | **Average Hold Time (Scratch/Breakeven)** (section 5, ⚠️) | Vérifier si couvert par les métriques de durée existantes | À vérifier dans le code |

### Ordre d'implémentation proposé

Phase 1 — **Fondations R-multiple** (prérequis pour toutes les versions R)
1. Valider décision sur `plannedRisk` (point 1 ci-dessus)
2. Ajouter `plannedRisk` au schéma + migration DB
3. Calculer R-multiple par trade (`pnl / plannedRisk`)
4. Implémenter les versions R de la section 1 (Total P&L en R, APPT en R, PF en R, etc.)

Phase 2 — **Ratios risque-rendement manquants**
5. Sortino Ratio
6. Calmar Ratio
7. SQN (Van Tharp)
8. Ulcer Index

Phase 3 — **Drawdown avancé**
9. Drawdown Duration
10. Recovery Time
11. Max DD Duration

Phase 4 — **Agrégations par période**
12. Stats mensuelles (best/lowest/avg month)
13. Stats hebdomadaires / annuelles

Phase 5 — **Distribution & divers**
14. Skewness
15. Kurtosis
16. MAE / MFE Ratio
17. ROI (si capital initial disponible)

Phase 6 — **Breakdowns par dimension**
18. Metrics by Day of Week (breakdown dédié)
19. Metrics by Month
20. Metrics by Side (Long/Short)

Phase 7 — **Dashboard paramétrable** (section 11)
21. Identifiant d'instance + bouton duplicate
22. Schéma de settings par chart
23. Migration des layouts existants

### Critères de "prêt"

- ✅ Toutes les métriques listées ont un statut clair (✅/❌/⚠️/écarté)
- ✅ Les prérequis schéma sont identifiés (plannedRisk)
- ✅ Les points à valider sont listés
- ✅ L'ordre d'implémentation est proposé par phase
- ⏳ Décisions en attente : points 1 à 6 du tableau ci-dessus

---

## Voir aussi

- `docs/dev/new-metrics.md` — liste des métriques visibles dans la capture `new-metrics.png`
- `docs/dev/OPT_MAE_MFE.md` — notes sur l'optimisation MAE/MFE
- `utils/tradeStats.ts` — calcul des métriques par trade
- `utils/dayStats.ts` — calcul des métriques journalières
- `composables/useAnalytics.ts` — breakdowns par ticker / heure / heatmap
