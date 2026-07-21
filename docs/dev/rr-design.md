# RR / R-multiple — Document de design

## 1. Définitions

### RR (Risk-Reward Ratio)
- **Ratio planifié avant le trade** : "je risque 100€ pour gagner 300€" = RR 1:3
- Statique, défini à l'entrée
- Formule : `reward visé / risk`

### R-multiple (Van Tharp)
- **Résultat réel normalisé par le risk** : `P&L réalisé / risk prévu`
- Dynamique, mesuré à la sortie
- Exemples : +300€ avec risk 100€ = **+3R**, -50€ avec risk 100€ = **-0.5R**
- Permet l'expectancy : "en moyenne je fais +0.3R par trade"

### Tableau comparatif

| | RR | R-multiple |
|---|---|---|
| Quand | Avant le trade | Après le trade |
| Formule | `reward planned / risk` | `P&L réel / risk` |
| Exemple | 1:3 (je vise 3x mon risk) | +2.1R (j'ai fait 2.1x mon risk) |
| Usage | Planification | Analyse de performance |

---

## 2. Le problème du "risk" — d'où vient-il ?

Le R-multiple a besoin d'un **dénominateur** : le risk prévu. Sans risk, on a juste un P&L en €, mais aucune référence pour dire "ce trade vaut +2R".

### Sources possibles du risk

| Source | Disponibilité | Fiabilité | Automatique ? |
|---|---|---|---|
| `trade.stopLoss` + prix | Déjà sur beaucoup de trades | ✅ Si SL respecté | ✅ Automatique |
| `trade.metadata.plannedRisk` (manuel) | Saisie formulaire | ✅ Explicite | ❌ Manuel |
| `account.metadata.defaultPlannedRisk` (compte) | Saisie paramètres | ✅ Explicite | ❌ Manuel (1 fois) |
| `pricePerPoint` du symbole | Liste hardcodée futures | ❌ Pas fiable (default -1) | ✅ Mais faux souvent |
| P&L seul (gain=TP, perte=SL) | Tous les trades | ❌ Toujours ±1R, inutile | ✅ Mais sans valeur |

### Pourquoi P&L + size seuls ne suffisent pas

Le P&L est le **numérateur**. Il manque le **dénominateur** (risk). Sans risk :
- Impossible de dire "+2R" ou "+0.5R"
- Assimiler le P&L au TP/SL revient à dire que tous les trades font ±1R → aucune information

### Pourquoi `pricePerPoint` n'est pas fiable

- Liste hardcodée (~20 symboles futures dans `utils/index.ts:209`)
- Default `-1` pour tout symbole non reconnu → calcul faux
- Pas validé par l'utilisateur (rempli auto à l'import)
- Sémantique floue (pip vs point vs tick selon l'instrument)

### Décision : pas de plannedRisk ni defaultPlannedRisk

**Suppression** de `plannedRisk` (trade) et `defaultPlannedRisk` (compte). Justification :
- Saisie manuelle fastidieuse et rarement remplie
- Le R-multiple se calcule automatiquement depuis le SL (voir section 3)
- Pour les trades sans SL, une hypothèse conservatrice suffit (voir section 4)
- UI plus simple (un champ de moins dans le formulaire de trade et les paramètres compte)

---

## 3. L'insight clé — le R-multiple est un pur ratio de prix

Le R-multiple est un **ratio** : `P&L / risk`. Si on calcule les deux dans la même unité (distance de prix), `lot` et `pricePerPoint` **s'annulent** :

```
R = P&L / risk
  = [(closePrice - openPrice) × lot × pricePerPoint] / [|openPrice - stopLoss| × lot × pricePerPoint]
  = (closePrice - openPrice) / |openPrice - stopLoss|
```

### Formule finale (sans lot, sans pricePerPoint)

```
Long  (buy)  : R = (closePrice - openPrice) / (openPrice - stopLoss)
Short (sell) : R = (openPrice - closePrice) / (stopLoss - openPrice)
```

### Exemples

- EUR/USD long : entry=1.1000, SL=1.0950, close=1.1080 → R = 0.0080 / 0.0050 = **+1.6R**
- ES long : entry=4500, SL=4490, close=4530 → R = 30 / 10 = **+3R**
- BTC short : entry=60000, SL=61000, close=57000 → R = 3000 / 1000 = **+3R**

**Marche pour tous les instruments** (Forex, futures, stocks, crypto) — pas besoin de configurer le symbole.

### Champs requis (déjà présents sur le trade)

- `openPrice` ✅
- `closePrice` ✅
- `stopLoss` ✅
- `type` (`'buy' | 'sell'`) ✅

---

## 4. Hypothèse "perte = SL touché" pour les trades sans SL

### Principe

Pour les trades **sans SL explicite**, on suppose qu'une perte correspond au SL touché. Cela permet de calculer R pour **tous les trades** sans aucune saisie manuelle.

### Résolution du R par trade

```
1. trade.stopLoss > 0 → R = ratio de prix (réel, exact)
2. trade perdant sans SL → R = -1R (hypothèse SL touché)
3. trade gagnant sans SL → R = gain / avgLoss (estimation)
4. trade breakeven sans SL → R = 0
```

### Couverture

- ✅ **100% des trades** ont un R calculé (réel ou estimé)
- ✅ Plus besoin de `plannedRisk` ni `defaultPlannedRisk`
- ✅ Hypothèse conservatrice (pessimiste sur les sorties anticipées)

### Limites de l'hypothèse

| Situation | Réalité | Estimation | Erreur |
|---|---|---|---|
| Coupe avant le SL | R > -1 (ex -0.5R) | -1R | Pessimiste (tu faisais mieux) |
| SL dépassé (slippage) | R < -1 (ex -1.3R) | -1R | Optimiste (tu faisais pire) |
| Ferme manuellement en perte | variable | -1R | Variable |
| Pas de SL du tout (trade impulsif) | inconnu | -1R | Fictif |

**Cas problématique** : "SL dépassé" → on sous-estime la perte réelle. Rare chez un trader discipliné.
**Cas acceptable** : "Coupe avant le SL" → on est pessimiste, donc conservateur. Mieux vaut sous-estimer que surestimer.

---

## 5. Indicateur de fiabilité adaptatif

Plus le % de trades avec SL réel est élevé, plus les métriques R sont fiables. On affiche un indicateur de fiabilité basé sur le coverage.

### Calcul du coverage

```
coverage = (nb trades avec SL / nb trades total) × 100
```

### Seuils

| Coverage | Label | Couleur | Comportement |
|---|---|---|---|
| ≥ 80% | "Fiable" | vert | R réel dominant |
| 50-79% | "Partiel" | orange | Mix réel + hypothèse |
| < 50% | "Approximatif" | rouge | Trop d'estimation |

### Affichage

```
Total R : +47R    ● Fiable — 87% réel, 13% estimé
Avg R gagnants : +1.8R
Avg R perdants : -1.0R   ← par construction si hypothèse respectée
```

Si `coverage = 0` (aucun trade avec SL) → masquer les métriques R, afficher juste le P/L Ratio.

---

## 6. Relation avec les métriques existantes

### P/L Ratio (déjà implémenté)

```
P/L Ratio = Average Win / Average Loss
```

**Proxy du RR moyen réalisé** : si on suppose que les trades perdants s'arrêtent toujours au SL (`avg loss ≈ risk`), alors `P/L Ratio ≈ Avg RR sur les gagnants`. Plus le nombre de trades est élevé, plus cette approximation est précise (loi des grands nombres).

### Complémentarité

| | P/L Ratio | R-multiple |
|---|---|---|
| Dénominateur | Avg Loss (perte réelle moyenne) | Planned Risk (SL ou hypothèse) |
| Source | P&L réalisé | SL ou hypothèse perte=SL |
| Marche sans SL | ✅ | ✅ (avec hypothèse) |
| Pris en compte risk variable | ❌ | ✅ |
| Détecte SL non respecté (R < -1) | ❌ | ✅ |
| Détecte sortie anticipée (R > -1 sur perdant) | ❌ | ✅ |
| Normalisation pour comparer périodes/comptes | ❌ (en €) | ✅ (en R) |

Le P/L Ratio reste utile comme proxy rapide. Le R-multiple ajoute la normalisation et l'analyse par trade.

---

## 7. Métriques R à afficher

| Métrique | Formule | Intérêt |
|---|---|---|
| **R par trade** | `P&L / risk` | Base individuelle |
| **Total R** | `Σ R` | Performance cumulée en unités de risque |
| **Expectancy R** (APPT en R) | `mean(R)` | R moyen par trade — seuil >+0.3R pour A+ setups (Van Tharp) |
| **Avg R gagnants** | `mean(R \| R > 0)` | RR moyen réalisé sur les gagnants |
| **Avg R perdants** | `mean(\|R\| \| R < 0)` | Risk moyen réalisé sur les perdants (devrait être ≈ 1R si SL respecté) |
| **P/L Ratio en R** | `avg R gagnants / avg R perdants` | Version normalisée du P/L Ratio |
| **Profit Factor en R** | `Σ R gagnants / \|Σ R perdants\|` | PF normalisé |
| **Largest Win / Loss en R** | `max(R) / min(R)` | Meilleur/pire trade en unités de risque |

### Affichage combiné dans le dashboard

Pour chaque métrique en €, afficher la version R à côté :

```
Total P&L        : +1 250 €    (+5.2R)
Avg Win          : +350 €      (+1.8R)
Avg Loss         : -180 €      (-1.0R)
P/L Ratio        : 1.94        (1.8R)    ← RR normalisé
Expectancy       : +45 €       (+0.21R)  ← seuil viabilité A+ setups
```

---

## 8. Cas particuliers à gérer

### SL = openPrice (distance nulle)
- `risk = 0` → division par zéro
- **Décision** : traité comme "sans SL" → hypothèse perte=SL ou gain/avgLoss

### SL du mauvais côté (SL au-dessus de l'entry sur un long)
- Donnée incohérente (SL invalide)
- **Décision** : traité comme "sans SL" → hypothèse

### Trade encore ouvert (pas de closePrice)
- Pas de P&L réalisé
- **Décision** : R non calculé (les trades ouverts ne sont pas dans le dashboard)

### Breakeven trades (P&L = 0)
- R = 0
- **Décision** : inclus dans les moyennes (R = 0 est valide)

### Trades avec SL mais sans plannedRisk
- **Cas le plus commun** → R réel calculé automatiquement depuis le ratio de prix

### Premier trade (aucun historique pour avgLoss)
- Impossible d'estimer R pour un gagnant sans SL
- **Décision** : R = null pour ce trade, exclu des métriques R

---

## 9. Plan d'implémentation

### Étape 1 : Nettoyage du plannedRisk (retrait)

Supprimer les champs ajoutés dans la Phase 1 qui ne sont plus nécessaires :

- `components/trade/FormModal.vue` — retirer le champ `plannedRisk`
- `schema/trade.ts` — retirer la référence à `plannedRisk` dans les commentaires
- `server/api/trades/[id].patch.ts` et `trades/index.post.ts` — retirer le traitement de `plannedRisk`
- `components/settings/Accounts.vue` — retirer le champ `defaultPlannedRisk`
- `schema/account.ts` — retirer la référence à `defaultPlannedRisk`
- `server/api/account/index.patch.ts` et `account/index.post.ts` — retirer le traitement
- `server/utils/standard-csv-parser.ts` et `server/api/import.post.ts` — retirer le mapping `plannedRisk`

### Étape 2 : Réécrire `utils/rMultiple.ts`

Nouvelle logique de résolution :

```ts
// Pseudo-code
const getRMultiple = (trade, avgLoss): number | null => {
    // 1. SL présent → R réel (ratio de prix)
    if (trade.stopLoss > 0 && isValidSL(trade)) {
        return trade.type === 'buy'
            ? (trade.closePrice - trade.openPrice) / (trade.openPrice - trade.stopLoss)
            : (trade.openPrice - trade.closePrice) / (trade.stopLoss - trade.openPrice)
    }
    // 2. Trade perdant sans SL → hypothèse SL touché
    if (trade.profit < 0) return -1
    // 3. Trade gagnant sans SL → estimation gain/avgLoss
    if (trade.profit > 0 && avgLoss > 0) return trade.profit / avgLoss
    // 4. Breakeven
    if (trade.profit === 0) return 0
    // 5. Premier trade (pas d'avgLoss)
    return null
}
```

### Étape 3 : Tests unitaires

Mettre à jour `tests/unit/utils/rMultiple.test.ts` :
- Trade long/short avec SL → R positif/négatif (réel)
- SL = openPrice → hypothèse (perte=-1R, gain=estimé)
- SL du mauvais côté → hypothèse
- Trade perdant sans SL → -1R
- Trade gagnant sans SL → gain/avgLoss
- Breakeven → 0
- Premier trade gagnant sans SL → null
- Coverage 100% (tous avec SL) → "Fiable"
- Coverage 0% (aucun SL) → "Approximatif"

### Étape 4 : UI dashboard

- `useDashboard.ts` : calculer `rMultipleCoverage` et `rMultipleReliability`
- `StatsSection.vue` : afficher l'indicateur de fiabilité à côté des métriques R
- `type/index.ts` : ajouter `rMultipleCoverage` et `rMultipleReliability` à `DashBoardResult`
- Traductions : ajouter les labels de fiabilité dans `en.js` et `fr.js`

### Étape 5 : Mise à jour de la doc

Mettre à jour `docs/dev/metrics-inventory.md` :
- Marquer les métriques R comme ✅
- Documenter la résolution (SL réel + hypothèse)
- Noter que le P/L Ratio reste comme proxy

---

## 10. Résumé

**Le R-multiple se calcule automatiquement avec juste `openPrice`, `closePrice`, `stopLoss`, `type`** — pas besoin de `pricePerPoint` ni de `lot`, car ce sont des ratios et les facteurs s'annulent.

**Pour les trades sans SL**, on utilise l'hypothèse "perte = SL touché" :
- Trade perdant sans SL → R = -1R
- Trade gagnant sans SL → R = gain / avgLoss

**Plus besoin de `plannedRisk` ni `defaultPlannedRisk`** — suppression des champs manuels, UI simplifiée.

**Indicateur de fiabilité adaptatif** basé sur le % de trades avec SL réel :
- ≥ 80% → "Fiable" (vert)
- 50-79% → "Partiel" (orange)
- < 50% → "Approximatif" (rouge)

**Combinaison gagnante** :
- P/L Ratio (existant) = proxy rapide, marche sans SL
- R-multiple depuis SL (nouveau) = précis, automatique pour les trades avec SL
- Hypothèse perte=SL (nouveau) = couverture 100% pour les trades sans SL
- Indicateur de fiabilité = transparence sur la part d'estimation
