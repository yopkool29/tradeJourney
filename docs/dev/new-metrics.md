# Nouvelles métriques (référence externe)

Liste des métriques visibles dans `docs/dev/new-metrics.png`, à comparer avec celles déjà implémentées dans PnlTracker.

## Résumé (haut de page)

- Best month
- Lowest month
- Average (per month)

## Colonne gauche

- Total P&L
- Average daily volume
- Average winning trade
- Average losing trade
- Total number of trades
- Number of winning trades
- Number of losing trades
- Number of break even trades
- Max consecutive wins
- Max consecutive losses
- Largest profit
- Largest loss
- Average hold time (All trades)
- Average hold time (Winning trades)
- Average hold time (Losing trades)
- Average hold time (Scratch trades)
- Average trade P&L
- Profit factor

## Colonne droite

- Open trades
- Total trading days
- Winning days
- Losing days
- Breakeven days
- Logged days
- Max consecutive winning days
- Max consecutive losing days
- Average daily P&L
- Average winning day P&L
- Average losing day P&L
- Largest profitable day (Profits)
- Largest losing day (Losses)
- Trade expectancy
- Max drawdown
- Max drawdown, %
- Average drawdown
- Average drawdown, %

## Notes

- **Open trades**: retiré de PnlTracker car tous les trades importés ont une `closeDate` obligatoire (voir `schema/trade.ts`), la métrique retournait donc toujours 0.
- **Logged days**: pas encore implémenté dans PnlTracker (nécessiterait un suivi des jours où l'utilisateur ouvre l'app / logue une note, indépendamment des trades).
- **Number of break even trades**: existe déjà (`getBreakevenTradesMetrics` dans `utils/tradeStats.ts`).
- **Average hold time (Scratch trades)**: correspond aux trades breakeven — à vérifier si couvert par les métriques de durée existantes.
