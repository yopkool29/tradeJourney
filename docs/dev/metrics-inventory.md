# Inventaire des métriques de trading

Liste exhaustive des métriques qu'on trouve dans les logiciels de trading (TradeStation, MT5, TradingView, journaux de trading type Pineify/PnLpad/PropScorer, etc.), avec mention de l'état d'implémentation dans PnlTracker.

Sources : recherches web (TorchTrade, Pineify, PnLpad, PropScorer, QuantifiedStrategies, TradingWyckoff, Alpha Charts, FX Foundations, ForexMechanics, TradersSecondBrain) + inventaire du code PnlTracker (`utils/tradeStats.ts`, `utils/dayStats.ts`, `composables/useAnalytics.ts`, `composables/useDashboard.ts`, `schema/trade.ts`).

Légende :
- ✅ Implémenté dans PnlTracker
- ❌ Manquant
- ⚠️ Partiel / à vérifier

---

## 1. Rentabilité (Profitability)

> Principe : chaque métrique en €/devise doit aussi pouvoir être exprimée en **R** (R-multiple), c'est-à-dire normalisée par le risk initial prévu du trade. Cela permet de comparer des trades de tailles différentes et de raisonner en unités de risque plutôt qu'en montant absolu.
>
> **Modèle de calcul du R-multiple** (décision validée — voir `docs/dev/rr-design.md`) :
>
> Le R-multiple se calcule automatiquement depuis le stopLoss, sans saisie manuelle. C'est un **ratio de prix** : `lot` et `pricePerPoint` s'annulent.
>
> ```
> Long  (buy)  : R = (closePrice - openPrice) / (openPrice - stopLoss)
> Short (sell) : R = (openPrice - closePrice) / (stopLoss - openPrice)
> ```
>
> **Résolution du R par trade** (3 cas) :
> ```
> 1. SL valide (bon côté, non nul) → R réel (ratio de prix, exact)
> 2. Trade perdant sans SL → R = -1R (hypothèse : SL touché)
> 3. Trade gagnant sans SL → R = profit / avgLoss (estimation)
> 4. Breakeven → R = 0
> ```
>
> **Indicateur de fiabilité** basé sur le % de trades avec SL réel :
> - ≥ 80% → "Fiable" (vert)
> - 50-79% → "Partiel" (orange)
> - 1-49% → "Approximatif" (rouge)
> - 0% → métriques R masquées, fallback sur P/L Ratio
>
> **Plus besoin de `plannedRisk` ni `defaultPlannedRisk`** — supprimés. Le R-multiple est entièrement automatique.
>
> **Note technique** : champs requis déjà présents sur le trade : `openPrice`, `closePrice`, `stopLoss`, `type` ('buy'|'sell'). Implémentation dans `utils/rMultiple.ts`.

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Total P&L (net / brut) | ✅ | `getPNL()` — `utils/tradeStats.ts:4` | Somme des profits/pertes |
| **Total P&L en R** (cumul R) | ✅ | `getTotalRMultiple()` — `utils/rMultiple.ts` | Somme des R-multiples — performance totale en unités de risque |
| Total Commission | ✅ | inline — `composables/useDashboard.ts` | Somme des commissions |
| Average Profit Per Trade (APPT) | ✅ | `getAPPT()` — `utils/tradeStats.ts:11` | Profit moyen par trade |
| **APPT en R** (expectancy en R) | ✅ | `getAPPTInR()` — `utils/rMultiple.ts` | R moyen par trade — seuil de viabilité: >+0.3R pour A+ setups (Van Tharp) |
| Win Rate | ✅ | `getWinrate()` — `utils/tradeStats.ts:33` | % de trades gagnants |
| Profit Factor | ✅ | `getProfitFactor()` — `utils/tradeStats.ts:86` | Profit brut / perte brute (formule MT5) |
| **Profit Factor en R** | ✅ | `getProfitFactorInR()` — `utils/rMultiple.ts` | Somme des R gagnants / \|somme des R perdants\| — version normalisée du PF |
| Expectancy | ✅ | `getExpectancy()` — `utils/tradeStats.ts:227` | (Win% × Avg Win) − (Loss% × Avg Loss) |
| P/L Ratio | ✅ | `getPLRatio()` — `utils/tradeStats.ts:21` | Gain moyen / perte moyenne — proxy du RR moyen réalisé |
| **P/L Ratio en R** | ✅ | `getPLRatioInR()` — `utils/rMultiple.ts` | R moyen gagnant / \|R moyen perdant\| |
| Total Profit / Total Loss | ✅ | `getWinningTradesMetrics` / `getLosingTradesMetrics` | Sommes des gains / pertes |
| **Total Profit / Loss en R** | ✅ | `getTotalProfitLossInR()` — `utils/rMultiple.ts` | Sommes des R gagnants / perdants |
| Average Win / Average Loss | ✅ | idem | Gain / perte moyenne |
| **Average Win / Loss en R** | ✅ | `getAvgWinLossInR()` — `utils/rMultiple.ts` | R moyen gagnant / perdant |
| Largest Win / Largest Loss | ✅ | idem | Meilleur / pire trade |
| **Largest Win / Loss en R** | ✅ | `getLargestWinLossInR()` — `utils/rMultiple.ts` | Meilleur / pire trade en unités de risque |
| Total / Winning / Losing / Breakeven trades | ✅ | `getWinningTradesMetrics`, `getLosingTradesMetrics`, `getBreakevenTradesMetrics` | Comptages |
| R-Multiple par trade | ✅ | `getRMultiple()` — `utils/rMultiple.ts` | Ratio de prix (SL) ou hypothèse (perte=SL) — base de toutes les versions R ci-dessus |
| **Fiabilité du R-multiple** | ✅ | `getRMultipleReliability()` — `utils/rMultiple.ts` | Indicateur adaptatif basé sur le % de trades avec SL |
| ROI / Return on Investment | ❌ | — | % de retour sur capital |

> Kelly Criterion et Risk of Ruin écartés — nécessitent des hypothèses statistiques fortes et une taille de position variable, peu utiles pour un tracker de journal.

---

## 2. Ratios risque-rendement (Risk-Adjusted)

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Sharpe Ratio | ✅ | `getSharpeRatio()` — `utils/tradeStats.ts:151` | (Rendement moyen − taux sans risque) / écart-type, annualisé |
| Sortino Ratio | ✅ | `getSortinoRatio()` — `utils/tradeStats.ts` | Variante Sharpe ne pénalisant que la volatilité négative — préféré par les traders |
| Recovery Factor | ✅ | `getRecoveryFactor()` — `utils/tradeStats.ts:116` | Profit net / max drawdown |
| Calmar Ratio | ✅ | `getCalmarRatio()` — `utils/tradeStats.ts` | Rendement annualisé / max drawdown (complément du Recovery Factor) |
| SQN (System Quality Number) | ✅ | `getSQN()` — `utils/tradeStats.ts` | `√N × Mean(R) / StdDev(R)` — Van Tharp, nécessite ≥30 trades |
| Ulcer Index | ✅ | `getUlcerIndex()` — `utils/tradeStats.ts` | `sqrt(mean(drawdown²))` — profondeur × durée des drawdowns |

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
| Average Hold Time (Scratch/Breakeven) | ❌ | — | `getBreakevenTradesMetrics` ne calcule que `count` + `totalContracts` — à étendre avec `avgDuration` / `maxDuration` |

> Time in Market et Average Holding Period by Symbol écartés — faible valeur ajoutée pour un journal de trading.

---

## 6. Statistiques temporelles

> Section renommée de "Statistiques journalières" à "Statistiques temporelles" — couvre maintenant jours, semaines et mois. Affichage sur 2 colonnes (`columns={2}` dans `StatsSection`).

| Métrique | État | Fonction / Fichier | Description |
|---|---|---|---|
| Total Trading Days | ✅ | `getTotalTradingDays()` — `utils/dayStats.ts:20` | Nombre total de jours de trading |
| Winning / Losing / Breakeven Days | ✅ | `utils/dayStats.ts:22-26` | Comptages |
| Max Consecutive Winning / Losing Days | ✅ | `utils/dayStats.ts:28-54` | Plus longues séries |
| **% semaines gagnantes** | ✅ | `getWinningWeeksPercent()` — `utils/dayStats.ts` | % de semaines avec P&L > 0 (sur les semaines avec trade) |
| **% mois gagnants** | ✅ | `getWinningMonthsPercent()` — `utils/dayStats.ts` | % de mois avec P&L > 0 (sur les mois avec trade) |
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
| Metrics by Ticker | ✅ | `calculateMetricsByDimension(trades, groupByTicker)` — `composables/useAnalytics.ts` | PnL, winrate, profit factor, avg win/loss, avg duration, avg MAE/MFE par symbole |
| Metrics by Hour Start | ✅ | `calculateMetricsByDimension(trades, groupByHourStart)` — `composables/useAnalytics.ts` | Métriques par heure d'ouverture (`openDate`) |
| Metrics by Hour End | ✅ | `calculateMetricsByDimension(trades, groupByHourEnd)` — `composables/useAnalytics.ts` | Métriques par heure de clôture (`closeDate`) |
| Hourly Heatmap (hour × day of week) | ✅ | `calculateHourlyHeatmapData()` — `composables/useAnalytics.ts` | Heatmap PnL/winrate (basée sur `openDate`) |
| Metrics by Day of Week | ✅ | `calculateMetricsByDimension(trades, groupByDayOfWeek)` — `composables/useAnalytics.ts` | Métriques par jour de la semaine (index 0-6, labels traduits) |
| Metrics by Month (saisonnalité) | ✅ | `calculateMetricsByDimension(trades, groupByMonth)` — `composables/useAnalytics.ts` | Métriques par mois de l'année (0-11, labels traduits) — pour analyse de saisonnalité |
| Metrics by Month + Year | ✅ | `calculateMetricsByDimension(trades, groupByMonthYear)` — `composables/useAnalytics.ts` | Métriques par mois et année (ex: "March 2024") — pour tendances chronologiques |
| Metrics by Type (Buy/Sell) | ✅ | `calculateMetricsByDimension(trades, groupByType)` — `composables/useAnalytics.ts` | Performance long vs short (anciennement "Side", renommé "Type") |
| **Metrics by Tag Group** | ✅ | `calculateMetricsByDimension(trades, groupFn)` — `composables/useAnalytics.ts` | Performance par tag group (dynamique : une dimension `tagGroup_<name>` par groupe) |

> Breakdowns écartés (nécessitent des champs non présents dans le schéma actuel) : Session (Asie/Europe/US), Strategy, A/B/C class. Pourront être ajoutés plus tard si ces champs sont introduits dans `schema/trade.ts`.

### Notes sur "Metrics by Tag Group" ✅ Implémenté

Les tags sont implémentés dans PnlTracker et constituent une dimension de breakdown très pertinente — typiquement utilisés pour marquer :
- Le **setup** (breakout, pullback, fade…)
- La **stratégie** (scalping, swing…)
- L'**erreur** (FOMO, revenge, no stop…)
- Le **contexte** (news, range, trend…)
- La **qualité** (A+, A, B, C — classification Van Tharp)

**Infrastructure utilisée** :
- `schema/tag.ts` — `TagSchema` (définition d'un tag)
- `schema/tagGroup.ts` — `TagGroupSchema` (un groupe contient plusieurs tags)
- `schema/trade.ts:229` — `tags: TagSchema[]` sur `TradeExtendedShema`
- `composables/useAnalytics.ts` — `getGroupFn()` + `calculateMetricsByDimension()` (générique)
- `composables/metrics/useBreakdownConfig.ts` — `dimensionOptions` + `metricOptions` (configuration des dimensions/métriques)
- `components/dashboard/charts/breakdown/BreakdownWidget.vue` — composant unique pour bar/scatter/table
- `components/dashboard/sections/BreakdownTable.vue` — table de breakdown (utilisée via le slot de BreakdownWidget)

**Comportement** :
- Une dimension `tagGroup_<name>` est générée dynamiquement pour chaque tag group
- Un trade avec plusieurs tags apparaît dans chaque groupe (overlap) — comportement attendu pour un système de tags
- Les tags d'un groupe qui ont 0 trade sont injectés avec des métriques vides (`injectEmptyTagMetrics`) — affichés avec valeurs vides dans tooltip/table
- Métriques affichées : PnL, winrate, PF, avg win/loss, avg duration, drawdown, expectancy, trades count
- Tri logique selon la dimension : chronologique pour dayOfWeek/month/monthYear/hourStart/hourEnd, par métrique décroissante pour ticker/tag/type
- **Tri avgLoss inversé** : la valeur retournée étant `-avgLoss` (négative), le tri est croissant sur la valeur retournée pour que la plus grande perte arrive en premier (cohérent avec le filtre Top N)
- **Filtrage avgLoss/avgWin** : les groupes sans trade perdant (`losingTradesCount === 0`) sont masqués pour avgLoss ; les groupes sans trade gagnant (`winningTradesCount === 0`) sont masqués pour avgWin — évite d'afficher des barres/points à 0 sans signification

**Charts breakdown — améliorations UX** :
- **dataZoom** : au-delà de 20 catégories, un slider + scroll (Shift+molette) permet de naviguer parmi tous les items sans scroller la page (barres horizontales, verticales, scatter)
- **Scatter jitter** : le jitter est appliqué sur l'axe X uniquement (catégorie) pour éviter la superposition de points à la même valeur Y, sans corrompre la valeur réelle (ex: winrate=100 reste 100, pas 98.5)
- **Densité** : `barMaxWidth` réduit (16px horizontal, 20px vertical) + `barCategoryGap: '10%'` pour afficher plus de barres à la fois
- **Clic sur chart** : désactivé pour les barres (`disableClickEnlarge`) pour éviter le conflit avec le dataZoom — l'agrandissement se fait uniquement via le bouton dédié
- **Modal agrandi** : ne se ferme plus au clic sur le chart (retrait du `@click` sur le conteneur du modal)

**Architecture générique** :
- `calculateMetricsByDimension(trades, groupFn, useNet)` — fonction unique pour tous les breakdowns
- `GroupFn = (trade) => string[]` — la dimension est définie par la fonction de grouping
- `getGroupFn(dimension, tagGroups)` — retourne la fonction de grouping pour une dimension donnée
- `sortMetricsByDimension(metrics, dimension, metric)` — tri logique centralisé
- `getMetricColor(m, metric)` — couleur centralisée (dégradé HSL smooth pour les charts et la table)
- `formatMetricValueForMetric(val, metric)` — formatage centralisé
- Ajouter une nouvelle dimension = 1 fonction de grouping + 1 entrée dans `dimensionOptions` de `useBreakdownConfig.ts`

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
| **Trade Frequency (trades/jour ouvré)** | ✅ | `getBusinessDaysFromTrades()` — `utils/dayStats.ts` | Nombre de trades / jours ouvrés (du premier au dernier trade, sans week-ends). Affiché dans "Tous les trades" |
| Average Daily Volume | ❌ | — | Non calculé actuellement — à implémenter (`getTotalContracts / totalTradingDays`) |
| Equity Curve | ✅ | — | Courbe de capital cumulé |

> Monte Carlo Drawdown, Buy & Hold Return, Benchmark vs marché, VaR, CVaR écartés — nécessitent un benchmark marché ou des simulations statistiques hors périmètre d'un journal de trading.

---

## Recommandations prioritaires

Métriques les plus citées comme "indispensables" dans la littérature et **manquantes** dans PnlTracker, par ordre de priorité :

1. ~~**Sortino Ratio**~~ ✅ Implémenté
2. ~~**R-Multiple & expectancy en R**~~ ✅ Implémenté
3. ~~**Calmar Ratio**~~ ✅ Implémenté
4. ~~**SQN (Van Tharp)**~~ ✅ Implémenté
5. ~~**Metrics by Tag**~~ ✅ Implémenté (tag groups dynamiques)
6. ~~**Trade Frequency**~~ ✅ Implémenté (trades/jour ouvré)
7. ~~**% semaines/mois gagnants**~~ ✅ Implémenté (Statistiques temporelles)
8. **Stats mensuelles** (best/lowest/avg month) — partiellement implémenté via `monthYear` breakdown, mais pas encore de récap best/worst/avg
9. **Drawdown duration / recovery time** — complément du max DD
10. **MAE / MFE Ratio** — qualité des entrées (les champs sont déjà stockés, juste le ratio à calculer)
11. **R-multiple distribution** — histogramme des R par trade (chart, pas une métrique). Montre visuellement si les gagnants sont sous 1R

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
- `scatter` — nuages de points (winrate par dimension, etc.)
- `heatmap` — heatmap heure × jour
- `pie` — win/loss
- `area` — aire (P&L cumulé en mode area)
- `barMA` — barres + moyenne mobile (TimeSeries)
- `boxplot` — distribution P&L par dimension (quartiles min/Q1/median/Q3/max)
- `calendar` — heatmap calendaire type GitHub (P&L par jour, multi-années, sélecteur d'année)
- `radar` — profil de performance multi-axes (winrate, PF, expectancy, P&L, trades)

**Améliorations récentes (ECharts)** :
- **dataZoom** sur barres et scatter (>20 catégories) avec Shift+molette pour le scroll
- **Séries transparentes** : MA et barres restent dans le tooltip même quand désactivées (opacity au lieu de suppression) — `notMerge: true` pour forcer le refresh
- **KeepAlive `max=1`** : limite le cache à 1 workspace pour éviter l'accumulation d'instances ECharts en mémoire (ralentissement progressif sans cette limite)
- **Jitter X sur scatter** : évite la superposition sans corrompre les valeurs Y
- **Heatmap** : correction du décalage tooltip (index maps construits à partir des labels triés)
- **Calendar** : composant dédié `CalendarWidget.vue` (sans `BaseWidgetCard`/`notMerge: true` qui causait un crash ECharts `points[0] is undefined`), sélecteur de métrique + tooltip metrics + sélecteur d'année, range adaptatif (année unique = format `'YYYY'`, multi-années = `['YYYY-01-01', 'YYYY-12-31']`)

Si migration vers ApexCharts : tous ces types sont supportés nativement, plus `area`, `rangeBar`, `boxPlot`, `violin`, `radar`, `radialBar`, `gauge`, `treemap`, `bubble`, `polarArea` qui ouvriraient de nouvelles visualisations (profil radar, jauges, distributions R-multiple, timeline de trades).

### Évolutions futures envisagées (ECharts)

#### Scatter 2D multi-métriques (corrélation)

Inspiré du [scatter-stream-visual](https://echarts.apache.org/examples/en/editor.html?c=scatter-stream-visual) ECharts : croiser **2 métriques** sur les axes X et Y, avec une **3ème métrique** pour la couleur (`visualMap`). Chaque point = un groupe (ticker, tag, jour de semaine, etc.).

**Principe** : contrairement au scatter actuel (1 métrique en Y, dimension en X), ce scatter positionne chaque groupe selon 2 métriques calculées — ce qui permet de visualiser des **corrélations** entre métriques.

**Performance** : pas de problème car on affiche des groupes agrégés (quelques dizaines/centaines de points max), pas des trades individuels. Les métriques sont déjà calculées par `calculateMetricsByDimension` — le coût supplémentaire est négligeable (2 métriques au lieu d'1).

**Cas d'usage** :

| Axe X | Axe Y | Couleur (visualMap) | Question répondue |
|---|---|---|---|
| Avg Win | Avg Loss | Expectancy | Profil risk/reward de chaque groupe |
| Winrate | Profit Factor | Trades Count | Groupes fiables vs chanceux |
| P&L | Drawdown | Trades Count | Rentabilité vs volatilité |
| Trades Count | Expectancy | P&L | Fréquence vs qualité |
| Avg Win | Winrate | Profit Factor | Edge : gain moyen × fréquence |
| P&L | Avg Duration | Winrate | Trades longs = plus rentables ? |

**Par trade individuel** (si on veut aller plus loin, avec `progressive`/`large` pour gérer le volume) :

| Axe X | Axe Y | Couleur | Question répondue |
|---|---|---|---|
| MFE | MAE | P&L | Qualité des entrées (sors trop tôt ? laisses courir les pertes ?) |
| P&L | Durée | Side (long/short) | Durée optimale |
| Lot size | P&L | Durée | Sizing influence le résultat ? |
| P&L | Heure d'ouverture | Jour de semaine | Patterns temporels |

**Implémentation** : nécessite 2 sélecteurs de métrique (X et Y) au lieu d'un seul dans `BreakdownWidget`. Le `visualMap` colore les points par une 3ème métrique. Type de chart : `scatter2D` (nouveau `BreakdownChartType`).

---

## 11. Duplication + reparamétrage de charts (écarté)

> **Décision** : fonctionnalité **écartée** pour l'instant. La duplication de charts n'apporte que peu de valeur sans filtres par instance (période/side/compte différents par chart) ou sans chart paramétrable (métrique/dimension au choix). Avec l'approche actuelle (templates prédefinis, un chart par type), dupliquer un chart donnerait deux instances identiques ou quasi-identiques (seule l'agrégation diffère sur 3 charts).
>
> Pourrait revenir plus tard si on introduit :
> - Des filtres par instance (période / side / compte différents par chart)
> - Ou un bar chart paramétrable (dimension + métrique au choix)
>
> **Architecture actuelle conservée** :
> - Slot `#settings` par chart dans `BaseWidgetCard.vue` (engrenage)
> - Store `chartSettingsPerDb` persisté (`Record<chartId, Record<setting, value>>`)
> - Settings existants : `cumuleMode` (CumulatedPnl, Winrate, Appt), `showBars` + `showMovingAverage` (barMA), `showThreshold` (area), `aggregation`, `maxTrades`, `metric` (barMA/area), `tooltipMetrics` (barMA/area)
> - Grille drag-and-drop + workspaces multiples + visibilité par breakpoint
> - **KeepAlive `max=1`** sur `DashboardGridLayout` : évite l'accumulation d'instances ECharts en mémoire lors des switches de workspace
> - **`notMerge: true`** sur tous les VChart : force le remplacement complet des options ECharts à chaque mise à jour (évite les états résiduels comme l'opacity qui persiste)
> - **`disableClickEnlarge`** prop sur `BaseWidgetCard` : désactive l'agrandissement au clic sur le chart (garde le bouton) — utilisé pour bar/barVertical (conflit avec dataZoom)
> - **Modal agrandi** : ne se ferme plus au clic sur le chart (retrait du `@click` sur le conteneur)
> - **dataZoom** : Shift+molette pour scroller le chart, molette seule pour scroller la page (listener en capture phase sur le conteneur)
>
> Voir les paramètres par chart envisagés (non planifiés pour l'instant) dans l'historique de discussion : `cumuleMode` étendu, `movingAveragePeriod` (select), `chartType` (line/bar/area), `sortBy`/`topN` pour les breakdowns, `metric` dans les breakdowns, `colorBy` pour les scatter.

---

## 12. Prêt pour implémentation

### Points à valider avant de commencer

| # | Décision | Options | Recommandation |
|---|---|---|---|
| 1 | **R-multiples** | ✅ Validé — calcul automatique depuis `stopLoss` (ratio de prix) + hypothèse "perte = SL touché" pour les trades sans SL. Plus de `plannedRisk` manuel. Voir section 1 et `docs/dev/rr-design.md`. | Validé |
| 2 | **ROI / Return on Investment** (section 1) | À implémenter ou écarter | À implémenter — simple (% retour sur capital), nécessite de connaître le capital initial |
| 3 | **Stats hebdomadaires / annuelles** (section 6) | À implémenter ou écarter | À implémenter en même temps que les stats mensuelles (même mécanisme d'agrégation) |
| 4 | **Lib de charts** | Rester sur ECharts ou migrer vers ApexCharts | Décision séparée — les métriques sont indépendantes de la lib de chart |
| 5 | **Average Daily Volume** (section 9) | Vérifié — non calculé dans le code | À implémenter (simple : `getTotalContracts / totalTradingDays`) |
| 6 | **Average Hold Time (Scratch/Breakeven)** (section 5) | Vérifié — `getBreakevenTradesMetrics` ne calcule que `count` + `totalContracts`, pas de duration | À implémenter en étendant `getBreakevenTradesMetrics` (ajouter `avgDuration`, `maxDuration`) |

### Ordre d'implémentation proposé

Phase 1 — **Fondations R-multiple** ✅ Terminé
1. ✅ Décision validée : calcul automatique depuis `stopLoss` (pas de plannedRisk manuel)
2. ✅ Calcul R-multiple par trade : `getRMultiple()` dans `utils/rMultiple.ts` (SL réel + hypothèse perte=SL)
3. ✅ Implémenter les versions R de la section 1 (Total P&L en R, APPT en R, PF en R, etc.)
4. ✅ Indicateur de fiabilité adaptatif (% de trades avec SL)
5. ✅ Tests unitaires : `tests/unit/utils/rMultiple.test.ts` (30 tests)

Phase 2 — **Ratios risque-rendement manquants** ✅ Terminé
6. ✅ Sortino Ratio — `getSortinoRatio()` dans `utils/tradeStats.ts`
7. ✅ Calmar Ratio — `getCalmarRatio()` dans `utils/tradeStats.ts`
8. ✅ SQN (Van Tharp) — `getSQN()` dans `utils/tradeStats.ts` (nécessite R-multiples, < 30 trades → 0)
9. ✅ Ulcer Index — `getUlcerIndex()` dans `utils/tradeStats.ts`
10. ✅ Tests : 15 nouveaux tests dans `tests/unit/utils/tradeStats.test.ts` (Sortino, SQN, Calmar, Ulcer — edge cases : empty, < 30 trades, stdDev=0, all winners)
11. ✅ UI : nouvelle section `RiskRatiosSection.vue` (PF, P/L Ratio, Recovery, Sharpe, Sortino, Calmar, SQN, Ulcer) — déplacée depuis `WinLossComparisonSection.vue`

Phase 3 — **Drawdown avancé**
11. Drawdown Duration
12. Recovery Time
13. Max DD Duration
14. **Tests** : ajouter tests avec scénarios de drawdown connus (peak → trough → recovery)

Phase 4 — **Agrégations par période**
15. Stats mensuelles (best/lowest/avg month)
16. Stats hebdomadaires / annuelles
17. **Tests** : créer `tests/unit/utils/dayStats.test.ts` si n'existe pas, ajouter tests agrégations par période

Phase 5 — **Distribution & divers**
18. Skewness
19. Kurtosis
20. MAE / MFE Ratio
21. ROI (si capital initial disponible)
22. Average Daily Volume
23. Average Hold Time (Scratch/Breakeven) — étendre `getBreakevenTradesMetrics`
24. **Tests** : ajouter tests pour chaque métrique (valeurs de référence, distributions symétriques/asymétriques)

Phase 6 — **Breakdowns par dimension** ✅ Terminé (Tag + Side + charts génériques)
25. ✅ **Metrics by Tag** — `groupByTag` + `calculateMetricsByDimension` (overlap multi-tags, "untagged" pour trades sans tag)
26. ☐ Metrics by Day of Week (breakdown dédié) — reporté (chart existe déjà)
27. ☐ Metrics by Month — reporté (Phase 4)
28. ✅ Metrics by Side (Long/Short) — `groupBySide` + `calculateMetricsByDimension`
29. ✅ Architecture générique : `calculateMetricsByDimension(trades, groupFn, useNet)` + `BreakdownTable.vue` paramétrable
30. ✅ Migration : `TickerBreakdownTable` refactorisé en wrapper du générique
31. ✅ Tests : `tests/unit/composables/useAnalytics.test.ts` (50 tests — by ticker, by tag, by side, getMetricValueForMetric, formatMetricValueForMetric, getMetricColor, sortMetricsByDimension, calculateMetricsBy2Dimensions (heatmap), groupBy open/close (month, dayOfWeek, hour), injectEmptyTagMetrics, edge cases)
32. ✅ Charts génériques : `BreakdownPnlBarChart.vue` + `BreakdownWinrateScatterChart.vue` (prop `dimension`)
33. ✅ Migration charts : `TickerPnlBarChart` + `TickerWinrateScatterChart` refactorisés en wrappers
34. ✅ Nouveaux charts : Tag (P&L + Winrate), Side (P&L + Winrate) — 4 nouveaux charts
35. ✅ Menu visibilité : réorganisé en 4 colonnes (Charts | Time | Breakdowns | Sections)

Phase 7 — **Métriques d'activité & consistance** ✅ Terminé
36. ✅ **Trade Frequency** — `getBusinessDaysFromTrades()` + `countBusinessDays()` dans `utils/dayStats.ts` (trades / jours ouvrés, sans week-ends). Affiché dans "Tous les trades" avec format `decimal1`
37. ✅ **% semaines gagnantes** — `getWinningWeeksPercent()` dans `utils/dayStats.ts` (groupe par semaine via `groupTradesByPeriod`)
38. ✅ **% mois gagnants** — `getWinningMonthsPercent()` dans `utils/dayStats.ts` (groupe par mois via `groupTradesByPeriod`)
39. ✅ Section renommée "Statistiques journalières" → "Statistiques temporelles" (couvre jours + semaines + mois)
40. ✅ Affichage sur 2 colonnes (`columns` prop sur `StatsSection`, grid responsive `sm:grid-cols-2`)
41. ✅ Tests : `tests/unit/utils/dayStats.test.ts` (18 tests — countBusinessDays, getBusinessDaysFromTrades, getWinningWeeksPercent, getWinningMonthsPercent, getTotalTradingDays)
42. ✅ Top N options étendues : Tous, 50, 40, 30, 20, 15, 10 (au lieu de Tous, 5, 10, 15, 20)

Phase 8 — **UI : menu de visibilité par dropdowns multiselect** ❌ Écarté
> Fonctionnalité jugée inutile — le menu actuel par checkboxes suffit.

> Phase "Dashboard paramétrable" (duplication de charts, instances multiples) **écartée** pour l'instant — voir section 11. Pourrait revenir plus tard si on introduit des filtres par instance ou un bar chart paramétrable.

### Tests unitaires

**Infrastructure existante** :
- Framework : **Vitest** (`vitest`)
- Tests unitaires : `tests/unit/` (ex: `tests/unit/utils/tradeStats.test.ts`)
- Tests d'intégration : `tests/integration/`
- Tests d'import : `tests/import/`
- Fichier de référence : `tests/unit/utils/tradeStats.test.ts` — contient déjà les tests pour `getPNL`, `getAPPT`, `getWinrate`, `getPLRatio`, `getProfitFactor`, `getRecoveryFactor`, `getSharpeRatio`, `getExpectancy`, `getStdDev`, `getWinningTradesMetrics`, `getLosingTradesMetrics`, `getBreakevenTradesMetrics`, `getMaxWinningStreak`, `getMaxLosingStreak`, `getMaxDrawdownWithDates`, `getMaxRunUpWithDates`, `movingAverage`
- `mockTrades` : 12 trades couvrant streaks, drawdown, breakeven — avec commentaires détaillés sur les valeurs attendues

**Conventions à suivre** (voir `.devin/rules/pnltracker-guidelines.md`) :
- Un seul `describe()` par fichier
- Tester le comportement essentiel + edge cases, pas chaque détail
- Utiliser `test.each` ou shared helpers pour éviter la duplication
- Éviter les mocks — tester avec de vraies données d'entrée

**Plan de tests par phase** :

| Phase | Fichier de test | Métriques à tester | Edge cases |
|---|---|---|---|
| 1 — R-multiples ✅ | `tests/unit/utils/rMultiple.test.ts` | R-multiple par trade, Total P&L en R, APPT en R, PF en R, P/L Ratio en R, Avg Win/Loss en R, Largest Win/Loss en R, coverage, fiabilité | SL invalide (0, mauvais côté, distance nulle), trade sans SL (hypothèse -1R), gagnant sans SL (estimation), breakeven, premier trade sans avgLoss |
| 2 — Ratios | `tests/unit/utils/tradeStats.test.ts` | Sortino, Calmar, SQN, Ulcer Index | Empty trades, 1 trade, division par zéro, < 30 trades pour SQN |
| 3 — Drawdown | `tests/unit/utils/tradeStats.test.ts` | Drawdown Duration, Recovery Time, Max DD Duration | Drawdown non récupéré, drawdown instantané |
| 4 — Agrégations | `tests/unit/utils/dayStats.test.ts` (à créer) | Stats mensuelles, hebdo, annuelles | Période vide, chevauchement de mois |
| 5 — Distribution | `tests/unit/utils/tradeStats.test.ts` | Skewness, Kurtosis, MAE/MFE Ratio, ROI, Avg Daily Volume, Avg Hold Time Scratch | Distribution symétrique, asymétrique, MAE/MFE null |
| 6 — Breakdowns ✅ | `tests/unit/composables/useAnalytics.test.ts` | `calculateMetricsByDimension`, `getMetricValueForMetric`, `formatMetricValueForMetric`, `getMetricColor`, `sortMetricsByDimension`, `calculateMetricsBy2Dimensions` (heatmap), `injectEmptyTagMetrics` | Multi-tags overlap, tag group filtering, trade sans tag, avgLoss tri, heatmap alignment, empty metrics |
| 7 — Activité ✅ | `tests/unit/utils/dayStats.test.ts` | `countBusinessDays`, `getBusinessDaysFromTrades`, `getWinningWeeksPercent`, `getWinningMonthsPercent`, `getTotalTradingDays` | Weekends exclus, same day, inversion dates, empty trades, single trade, all winning/losing weeks, mixed months |

**Règle** : chaque nouvelle métrique doit avoir son test dans la même phase que son implémentation. Pas de test = pas de merge.

### Critères de "prêt"

- ✅ Toutes les métriques listées ont un statut clair (✅/❌/⚠️/écarté)
- ✅ Les prérequis sont identifiés (calcul R depuis `stopLoss` — pas de champ manuel)
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
