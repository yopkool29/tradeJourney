import { startOfDay, endOfDay } from 'date-fns';
import { round as _round } from "~/utils";

export const getPNL = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    const result = trades.reduce((acc, trade) => acc + (useNet ? trade.netProfit : trade.profit), 0)
    if (round < 0)
        return result
    return _round(result, round)
}

export const getAPPT = (trades: { profit: number; netProfit: number }[], fixNanToZero: boolean, round = -1, useNet = true) => {
    const totalProfit = getPNL(trades, -1, useNet)
    const totalTrades = trades.length
    let result = (totalProfit / totalTrades)
    if (round >= 0)
        result = _round(result, round)
    result = fixNanToZero && isNaN(result) ? 0 : result
    return result
}

export const getPLRatio = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    const winners = trades.filter(trade => (useNet ? trade.netProfit : trade.profit) > 0)
    const losers = trades.filter(trade => (useNet ? trade.netProfit : trade.profit) < 0)
    const avgWin = winners.length > 0 ? winners.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0) / winners.length : 0
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0) / losers.length) : 0

    const result = avgLoss === 0 ? 0 : avgWin / avgLoss
    if (round < 0)
        return result
    return _round(result, round)
}

export const getWinrate = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    const totalTrades = trades.length
    if (totalTrades === 0) return 0
    const winningTrades = trades.filter(trade => (useNet ? trade.netProfit : trade.profit) > 0).length
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

export const getWinLossNb = (trades: { closeDate: Date | string; profit: number; netProfit: number }[], date: Date, useNet = true) => {
    const sd = startOfDay(date)
    const ed = endOfDay(date)
    const wins = trades.filter(trade => new Date(trade.closeDate).getTime() >= sd.getTime() && new Date(trade.closeDate).getTime() <= ed.getTime() && (useNet ? trade.netProfit : trade.profit) > 0).length
    const losses = trades.filter(trade => new Date(trade.closeDate).getTime() >= sd.getTime() && new Date(trade.closeDate).getTime() <= ed.getTime() && (useNet ? trade.netProfit : trade.profit) < 0).length
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
export const getProfitFactor = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    // Séparer les profits et les pertes
    let grossProfit = 0;
    let grossLoss = 0;

    // Calculer le profit brut et la perte brute
    trades.forEach(trade => {
        const value = useNet ? trade.netProfit : trade.profit;
        if (value > 0) {
            grossProfit += value;
        } else if (value < 0) {
            grossLoss += Math.abs(value);
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
export const getRecoveryFactor = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    if (trades.length === 0) return 0

    const netProfit = getPNL(trades, -1, useNet)

    // Calcul du drawdown maximal
    let balance = 0
    let peak = 0
    let maxDrawdown = 0

    for (const trade of trades) {
        balance += useNet ? trade.netProfit : trade.profit
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
export const getSharpeRatio = (trades: { profit: number; netProfit: number; openDate?: Date | string }[], riskFreeRate = 0, round = -1, useNet = true) => {
    if (trades.length < 2) return 0

    const returns = trades.map(trade => useNet ? trade.netProfit : trade.profit)

    const meanReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length

    const squaredDiffs = returns.map(val => Math.pow(val - meanReturn, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (returns.length - 1)
    const stdDev = Math.sqrt(variance)

    const rawSharpe = stdDev === 0 ? 0 : (meanReturn - riskFreeRate) / stdDev

    // Annualisation : √(trades par an) pour obtenir un ratio comparable aux standards financiers
    const tradesWithDates = trades.filter(t => t.openDate)
    let annualizationFactor = 1
    if (tradesWithDates.length >= 2) {
        const dates = tradesWithDates.map(t => new Date(t.openDate!).getTime())
        const minDate = Math.min(...dates)
        const maxDate = Math.max(...dates)
        const years = (maxDate - minDate) / (365.25 * 24 * 60 * 60 * 1000)
        if (years > 0) {
            const tradesPerYear = Math.min(trades.length / years, 252)
            annualizationFactor = Math.sqrt(tradesPerYear)
        }
    }

    const result = rawSharpe * annualizationFactor

    if (round < 0)
        return result
    return _round(result, round)
}

/**
 * Calcule la durée moyenne des trades en minutes
 */
export const getAvgTradeDuration = (trades: { openDate: Date | string, closeDate: Date | string }[], round = -1) => {
    if (trades.length === 0) return 0
    
    const totalDuration = trades.reduce((acc, trade) => {
        const open = new Date(trade.openDate).getTime()
        const close = new Date(trade.closeDate).getTime()
        return acc + (close - open)
    }, 0)
    
    const avgMs = totalDuration / trades.length
    const result = avgMs / (1000 * 60) // Convertir en minutes
    
    if (round < 0) return result
    return _round(result, round)
}

/**
 * Calcule la durée maximale des trades en minutes
 */
export const getMaxTradeDuration = (trades: { openDate: Date | string, closeDate: Date | string }[], round = -1) => {
    if (trades.length === 0) return 0
    
    const maxDuration = trades.reduce((max, trade) => {
        const open = new Date(trade.openDate).getTime()
        const close = new Date(trade.closeDate).getTime()
        const duration = close - open
        return Math.max(max, duration)
    }, 0)
    
    const result = maxDuration / (1000 * 60) // Convertir en minutes
    
    if (round < 0) return result
    return _round(result, round)
}

/**
 * Calcule l'expectancy (espérance mathématique)
 * Formule: (Win% × Avg Win) - (Loss% × Avg Loss)
 */
export const getExpectancy = (trades: { profit: number; netProfit: number }[], round = -1, useNet = true) => {
    if (trades.length === 0) return 0
    
    const winners = trades.filter(t => (useNet ? t.netProfit : t.profit) > 0)
    const losers = trades.filter(t => (useNet ? t.netProfit : t.profit) < 0)
    
    const winRate = winners.length / trades.length
    const lossRate = losers.length / trades.length
    
    const avgWin = winners.length > 0 ? winners.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0) / winners.length : 0
    const avgLoss = losers.length > 0 ? Math.abs(losers.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0) / losers.length) : 0
    
    const result = (winRate * avgWin) - (lossRate * avgLoss)
    
    if (round < 0) return result
    return _round(result, round)
}

/**
 * Calcule l'écart-type (standard deviation)
 */
export const getStdDev = (values: number[], round = -1) => {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
    const result = Math.sqrt(variance)
    
    if (round < 0) return result
    return _round(result, round)
}

/**
 * Calcule le total des contrats
 */
export const getTotalContracts = (trades: { lot: number }[]) => {
    const total = trades.reduce((acc, trade) => acc + trade.lot, 0)
    return _round(total, 2)
}

/**
 * Calcule les métriques des trades gagnants
 */
export const getWinningTradesMetrics = (trades: { profit: number; netProfit: number; lot: number; commission?: number; openDate: Date | string; closeDate: Date | string }[], useNet = true) => {
    const winners = trades.filter(t => (useNet ? t.netProfit : t.profit) > 0)
    
    if (winners.length === 0) {
        return {
            count: 0,
            totalProfit: 0,
            totalContracts: 0,
            largest: 0,
            average: 0,
            stdDev: 0,
            avgDuration: 0,
            maxDuration: 0,
            totalCommission: 0
        }
    }
    
    const profits = winners.map(t => useNet ? t.netProfit : t.profit)
    
    return {
        count: winners.length,
        totalProfit: _round(winners.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0), 2),
        totalContracts: getTotalContracts(winners),
        largest: _round(Math.max(...profits), 2),
        average: _round(profits.reduce((a, b) => a + b, 0) / profits.length, 2),
        stdDev: getStdDev(profits, 2),
        avgDuration: getAvgTradeDuration(winners, 2),
        maxDuration: getMaxTradeDuration(winners, 2),
        totalCommission: _round(winners.reduce((acc, t) => acc + (t.commission || 0), 0), 2)
    }
}

/**
 * Calcule les métriques des trades perdants
 */
export const getLosingTradesMetrics = (trades: { profit: number; netProfit: number; lot: number; commission?: number; openDate: Date | string; closeDate: Date | string }[], useNet = true) => {
    const losers = trades.filter(t => (useNet ? t.netProfit : t.profit) < 0)
    
    if (losers.length === 0) {
        return {
            count: 0,
            totalLoss: 0,
            totalContracts: 0,
            largest: 0,
            average: 0,
            stdDev: 0,
            avgDuration: 0,
            maxDuration: 0,
            totalCommission: 0
        }
    }
    
    const losses = losers.map(t => Math.abs(useNet ? t.netProfit : t.profit))
    
    return {
        count: losers.length,
        totalLoss: _round(losers.reduce((acc, t) => acc + (useNet ? t.netProfit : t.profit), 0), 2),
        totalContracts: getTotalContracts(losers),
        largest: _round(Math.max(...losses), 2),
        average: _round(losses.reduce((a, b) => a + b, 0) / losses.length, 2),
        stdDev: getStdDev(losses, 2),
        avgDuration: getAvgTradeDuration(losers, 2),
        maxDuration: getMaxTradeDuration(losers, 2),
        totalCommission: _round(losers.reduce((acc, t) => acc + (t.commission || 0), 0), 2)
    }
}

/**
 * Calcule les métriques des trades à l'équilibre
 */
export const getBreakevenTradesMetrics = (trades: { profit: number; netProfit: number; lot: number }[], useNet = true) => {
    const breakevens = trades.filter(t => (useNet ? t.netProfit : t.profit) === 0)
    
    return {
        count: breakevens.length,
        totalContracts: getTotalContracts(breakevens)
    }
}

/**
 * Calcule le winning streak maximum (nombre de trades gagnants consécutifs)
 */
export const getMaxWinningStreak = (trades: { profit: number; netProfit: number }[], useNet = true): number => {
    if (trades.length === 0) return 0
    
    let maxStreak = 0
    let currentStreak = 0
    
    for (const trade of trades) {
        if ((useNet ? trade.netProfit : trade.profit) > 0) {
            currentStreak++
            maxStreak = Math.max(maxStreak, currentStreak)
        } else {
            currentStreak = 0
        }
    }
    
    return maxStreak
}

/**
 * Calcule le losing streak maximum (nombre de trades perdants consécutifs)
 */
export const getMaxLosingStreak = (trades: { profit: number; netProfit: number }[], useNet = true): number => {
    if (trades.length === 0) return 0
    
    let maxStreak = 0
    let currentStreak = 0
    
    for (const trade of trades) {
        if ((useNet ? trade.netProfit : trade.profit) < 0) {
            currentStreak++
            maxStreak = Math.max(maxStreak, currentStreak)
        } else {
            currentStreak = 0
        }
    }
    
    return maxStreak
}

/**
 * Calcule le max drawdown avec les dates
 */
export const getMaxDrawdownWithDates = (trades: { profit: number; netProfit: number; closeDate: Date | string }[], useNet = true): { maxDrawdown: number; dateFrom: Date | null; dateTo: Date | null } => {
    if (trades.length === 0) {
        return {
            maxDrawdown: 0,
            dateFrom: null,
            dateTo: null
        }
    }
    
    let balance = 0
    let peak = 0
    let peakIndex = 0
    let maxDrawdown = 0
    let maxDrawdownStartIndex = 0
    let maxDrawdownEndIndex = 0
    
    trades.forEach((trade, index) => {
        balance += useNet ? trade.netProfit : trade.profit
        
        if (balance > peak) {
            peak = balance
            peakIndex = index
        } else {
            const drawdown = peak - balance
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
                maxDrawdownStartIndex = peakIndex
                maxDrawdownEndIndex = index
            }
        }
    })
    
    return {
        maxDrawdown,
        dateFrom: maxDrawdownStartIndex < trades.length ? new Date(trades[maxDrawdownStartIndex].closeDate) : null,
        dateTo: maxDrawdownEndIndex < trades.length ? new Date(trades[maxDrawdownEndIndex].closeDate) : null
    }
}

/**
 * Calcule le max run-up avec les dates
 */
export const getMaxRunUpWithDates = (trades: { profit: number; netProfit: number; closeDate: Date | string }[], useNet = true) => {
    if (trades.length === 0) {
        return {
            maxRunUp: 0,
            dateFrom: null,
            dateTo: null
        }
    }
    
    let balance = 0
    let trough = 0
    let troughIndex = 0
    let maxRunUp = 0
    let maxRunUpStartIndex = 0
    let maxRunUpEndIndex = 0
    
    trades.forEach((trade, index) => {
        balance += useNet ? trade.netProfit : trade.profit
        
        if (balance < trough) {
            trough = balance
            troughIndex = index
        } else {
            const runUp = balance - trough
            if (runUp > maxRunUp) {
                maxRunUp = runUp
                maxRunUpStartIndex = troughIndex
                maxRunUpEndIndex = index
            }
        }
    })
    
    return {
        maxRunUp,
        dateFrom: maxRunUpStartIndex < trades.length ? new Date(trades[maxRunUpStartIndex].closeDate) : null,
        dateTo: maxRunUpEndIndex < trades.length ? new Date(trades[maxRunUpEndIndex].closeDate) : null
    }
}