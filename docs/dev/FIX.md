# Max Run-up — Explication du calcul

## Definition

Max Run-up (MFE / Maximum Favorable Excursion sur l'equity curve) = meilleur rallye de la courbe cumulative depuis un creux jusqu'a un pic.

Ce n'est PAS le max run-up d'un trade individuel. C'est le meilleur rallye consecutif de l'ensemble des trades sur la periode filtree.

## Algorithme (`utils/tradeStats.ts:getMaxRunUpWithDates`)

```
balance = 0
trough  = 0          // plus bas atteint (depart du run)
troughIndex = 0
maxRunUp = 0
maxRunUpEndIndex = 0

Pour chaque trade (dans l'ordre de closeDate):
    balance += profitDuTrade

    Si balance < trough:
        // Nouveau creux → le run-up precedent est "reset"
        // Un nouveau run-up commencera a partir d'ici
        trough = balance
        troughIndex = index
    Sinon:
        // On est au-dessus du dernier creux
        // Le run-up "continue" (meme si on a un trade perdant)
        runUp = balance - trough
        Si runUp > maxRunUp:
            maxRunUp = runUp
            maxRunUpStartIndex = troughIndex
            maxRunUpEndIndex   = index   // ← le run "s'arrete" ici
```

## Quand le run s'arrete-t-il ?

**Le run ne s'arrete pas quand on a un trade perdant.**

Le run s'arrete uniquement quand:
1. On atteint un **nouveau creux** (balance < trough) → reset, nouveau run
2. Ou quand on atteint un **nouveau pic record** → la date `to` est mise a jour

Consequence: un run-up peut traverser plusieurs trades perdants, tant que le balance total reste au-dessus du dernier creux. La date "to" n'est donc pas la fin d'un "mouvement" mais simplement le moment ou le record a ete battu.

### Exemple

| Trade | Profit | Balance | Trough | Run-up | Max Run-up | Date "to" |
|-------|--------|---------|--------|--------|------------|-----------|
| #1    | +100   | 100     | 0      | 100    | 100        | #1        |
| #2    | +50    | 150     | 0      | 150    | 150        | #2        |
| #3    | -10    | 140     | 0      | 140    | 150        | #2        |
| #4    | +200   | 340     | 0      | 340    | 340        | #4        |

Resultat final:
- Max Run-up = $340
- Date from = date du trade #1 (trough a 0)
- Date to   = date du trade #4 (pic record)

Meme si le trade #3 est perdant, le run "continue" car on n'a pas fait de nouveau creux.

## Probleme d'affichage UX

Le Max Run-up est affiche dans `ProfitTradesSection` qui montre le **PnlBarChart** (trades individuels, non cumules). C'est visuellement deconnecte — on ne peut pas voir le run-up de $966 sur un graphique en barres separees.

**Suggestion:** deplacer le Max Run-up dans la section `CumulatedPnlChart`, ou ajouter une `markArea` sur le Cumulated PnL Chart pour visualiser la periode du max run-up.

## Fichiers concernes

- `utils/tradeStats.ts:437-474` — calcul
- `composables/useDashboard.ts:107-111` — injection dans le dashboardResult
- `components/dashboard/ProfitTradesSection.vue:58-73` — affichage (mauvaise section)


vérifier la font

Max Run-up:
$966.58
Max Run-up from:
29/01/2026, 15:59
Max Run-up to: