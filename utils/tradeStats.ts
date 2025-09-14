import { startOfDay, endOfDay } from 'date-fns';
import { round as _round } from "~/utils";

export const getPNL = (trades: { profit: number }[], round = -1) => {
    const result = trades.reduce((acc, trade) => acc + trade.profit, 0)
    if (round < 0)
        return result
    return _round(result, round)
}

export const getAPPT = (trades: { profit: number }[], fixNanToZero: boolean, round = -1) => {
    const totalProfit = getPNL(trades, -1)
    const totalTrades = trades.length
    let result = (totalProfit / totalTrades)
    if (round >= 0)
        result = _round(result, round)
    result = fixNanToZero && isNaN(result) ? 0 : result
    return result
}

export const getPLRatio = (trades: { profit: number }[], round = -1) => {
    const winners = trades.filter(trade => trade.profit > 0)
    const losers = trades.filter(trade => trade.profit < 0)
    const avgWin = winners.length > 0 ? winners.reduce((acc, t) => acc + t.profit, 0) / winners.length : 0
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((acc, t) => acc + t.profit, 0) / losers.length) : 0

    const result = avgLoss === 0 ? 0 : avgWin / avgLoss
    if (round < 0)
        return result
    return _round(result, round)
}

export const getWinrate = (trades: { profit: number }[], round = -1) => {
    const totalTrades = trades.length
    if (totalTrades === 0) return 0
    const winningTrades = trades.filter(trade => trade.profit > 0).length
    const result = (winningTrades / totalTrades) * 100
    if (round < 0)
        return result
    return _round(result, round)
}

export const getNbTrades = (trades: { closeDate: Date | string }[], date: Date) => {
    const sd = startOfDay(date)
    const ed = endOfDay(date)
    return trades.filter(trade => new Date(trade.closeDate).getTime() >= sd.getTime() && new Date(trade.closeDate).getTime() <= ed.getTime()).length
}

export const getWinLossNb = (trades: { closeDate: Date | string, profit: number }[], date: Date) => {
    const sd = startOfDay(date)
    const ed = endOfDay(date)
    const wins = trades.filter(trade => new Date(trade.closeDate).getTime() >= sd.getTime() && new Date(trade.closeDate).getTime() <= ed.getTime() && trade.profit > 0).length
    const losses = trades.filter(trade => new Date(trade.closeDate).getTime() >= sd.getTime() && new Date(trade.closeDate).getTime() <= ed.getTime() && trade.profit < 0).length
    return { wins, losses }
}

export function movingAverage(data: number[], windowSize: number): number[] {
    if (!Array.isArray(data) || windowSize <= 1) return data

    const result: number[] = []

    for (let i = 0; i < data.length; i++) {
        // Prendre la valeur actuelle + les (windowSize-1) valeurs précédentes
        const start = Math.max(0, i - windowSize + 1)
        const end = i + 1
        const window = data.slice(start, end)

        // Calculer la moyenne sur la fenêtre courante
        const sum = window.reduce((a, b) => a + b, 0)

        const val = (sum / window.length)

        result.push(round(val, 2))
    }

    return result
}

/**
 * Calcule le facteur de profit (Profit Factor)
 * Ratio entre le profit brut total et la perte brute totale (en valeur absolue)
 * @param trades Liste des trades
 * @param round Nombre de décimales pour l'arrondi (-1 pour ne pas arrondir)
 * @returns Facteur de profit
 */
export const getProfitFactor = (trades: { profit: number }[], round = -1) => {
    // Séparer les profits et les pertes
    let grossProfit = 0;
    let grossLoss = 0;

    // Calculer le profit brut et la perte brute
    trades.forEach(trade => {
        if (trade.profit > 0) {
            grossProfit += trade.profit;
        } else if (trade.profit < 0) {
            grossLoss += Math.abs(trade.profit);
        }
    });

    // Calculer le facteur de profit selon la formule MT5
    const result = grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss;

    if (round < 0)
        return result;
    return _round(result, round)
}

/**
 * Calcule le facteur de récupération (Recovery Factor)
 * Ratio entre le profit net total et le drawdown maximal
 * @param trades Liste des trades
 * @param round Nombre de décimales pour l'arrondi (-1 pour ne pas arrondir)
 * @returns Facteur de récupération
 */
export const getRecoveryFactor = (trades: { profit: number }[], round = -1) => {
    if (trades.length === 0) return 0

    const netProfit = getPNL(trades, -1)

    // Calcul du drawdown maximal
    let balance = 0
    let peak = 0
    let maxDrawdown = 0

    for (const trade of trades) {
        balance += trade.profit
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            maxDrawdown = Math.max(maxDrawdown, drawdown)
        }
    }

    const result = maxDrawdown === 0 ? (netProfit > 0 ? Infinity : 0) : netProfit / maxDrawdown

    if (round < 0)
        return result
    return _round(result, round)
}

/**
 * Calcule le ratio de Sharpe selon la formule MT5
 * Mesure du rendement ajusté au risque: (Rendement moyen - Taux sans risque) / Écart-type des rendements
 * @param trades Liste des trades
 * @param riskFreeRate Taux sans risque (par défaut 0)
 * @param round Nombre de décimales pour l'arrondi (-1 pour ne pas arrondir)
 * @returns Ratio de Sharpe
 */
export const getSharpeRatio = (trades: { profit: number }[], riskFreeRate = 0, round = -1) => {
    if (trades.length < 2) return 0

    // Calculer les rendements quotidiens (ou par trade)
    const returns = trades.map(trade => trade.profit)

    // Calculer le rendement moyen
    const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length

    // Calculer l'écart-type des rendements
    const squaredDiffs = returns.map(val => Math.pow(val - meanReturn, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (returns.length - 1)
    const stdDev = Math.sqrt(variance)

    // Calculer le ratio de Sharpe selon la formule MT5
    // (Rendement moyen - Taux sans risque) / Écart-type
    const result = stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev

    if (round < 0)
        return result
    return _round(result, round)
}