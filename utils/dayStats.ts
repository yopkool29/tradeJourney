import { groupTradesByPeriod } from './dashboard'
import { round as _round } from './index'
import type { TradeExtendedType } from '~/schema/trade'
import type { SettingsContentType } from '~/schema/user'

type DailyPnl = {
    date: string
    pnl: number
}

export const getDailyPnlArray = (trades: TradeExtendedType[], useNet: boolean, settings: Partial<SettingsContentType> | null): DailyPnl[] => {
    const grouped = groupTradesByPeriod(trades, 'day', settings)
    const entries = Object.entries(grouped).map(([date, dayTrades]) => ({
        date,
        pnl: dayTrades.reduce((sum, t) => sum + (useNet ? t.netProfit : t.profit), 0),
    }))
    return entries.sort((a, b) => a.date.localeCompare(b.date))
}

export const getTotalTradingDays = (dailyPnls: DailyPnl[]): number => dailyPnls.length

export const getWinningDaysCount = (dailyPnls: DailyPnl[]): number => dailyPnls.filter(d => d.pnl > 0).length

export const getLosingDaysCount = (dailyPnls: DailyPnl[]): number => dailyPnls.filter(d => d.pnl < 0).length

export const getBreakevenDaysCount = (dailyPnls: DailyPnl[]): number => dailyPnls.filter(d => d.pnl === 0).length

export const getMaxConsecutiveWinningDays = (dailyPnls: DailyPnl[]): number => {
    let max = 0
    let current = 0
    for (const day of dailyPnls) {
        if (day.pnl > 0) {
            current += 1
            max = Math.max(max, current)
        } else {
            current = 0
        }
    }
    return max
}

export const getMaxConsecutiveLosingDays = (dailyPnls: DailyPnl[]): number => {
    let max = 0
    let current = 0
    for (const day of dailyPnls) {
        if (day.pnl < 0) {
            current += 1
            max = Math.max(max, current)
        } else {
            current = 0
        }
    }
    return max
}

export const getAverageDailyPnl = (dailyPnls: DailyPnl[], round = -1): number => {
    if (dailyPnls.length === 0) return 0
    const avg = dailyPnls.reduce((sum, d) => sum + d.pnl, 0) / dailyPnls.length
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageWinningDayPnl = (dailyPnls: DailyPnl[], round = -1): number => {
    const winners = dailyPnls.filter(d => d.pnl > 0)
    if (winners.length === 0) return 0
    const avg = winners.reduce((sum, d) => sum + d.pnl, 0) / winners.length
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageLosingDayPnl = (dailyPnls: DailyPnl[], round = -1): number => {
    const losers = dailyPnls.filter(d => d.pnl < 0)
    if (losers.length === 0) return 0
    const avg = losers.reduce((sum, d) => sum + d.pnl, 0) / losers.length
    return round < 0 ? avg : _round(avg, round)
}

export const getLargestProfitableDay = (dailyPnls: DailyPnl[]): DailyPnl | null => {
    const winners = dailyPnls.filter(d => d.pnl > 0)
    if (winners.length === 0) return null
    return winners.reduce((max, d) => (d.pnl > max.pnl ? d : max), winners[0])
}

export const getLargestLosingDay = (dailyPnls: DailyPnl[]): DailyPnl | null => {
    const losers = dailyPnls.filter(d => d.pnl < 0)
    if (losers.length === 0) return null
    return losers.reduce((min, d) => (d.pnl < min.pnl ? d : min), losers[0])
}

export const getDailyMaxDrawdownWithPercent = (dailyPnls: DailyPnl[], round = -1) => {
    let balance = 0
    let peak = 0
    let maxDrawdown = 0
    let maxDrawdownPercent = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
                maxDrawdownPercent = peak === 0 ? 0 : (drawdown / peak) * 100
            }
        }
    }

    return {
        maxDrawdown: round < 0 ? maxDrawdown : _round(maxDrawdown, round),
        maxDrawdownPercent: round < 0 ? maxDrawdownPercent : _round(maxDrawdownPercent, round),
    }
}

export const getAverageDrawdown = (dailyPnls: DailyPnl[], round = -1): number => {
    let balance = 0
    let peak = 0
    let totalDrawdown = 0
    let drawdownDays = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            totalDrawdown += drawdown
            drawdownDays += 1
        }
    }

    if (drawdownDays === 0) return 0
    const avg = totalDrawdown / drawdownDays
    return round < 0 ? avg : _round(avg, round)
}

export const getAverageDrawdownPercent = (dailyPnls: DailyPnl[], round = -1): number => {
    let balance = 0
    let peak = 0
    let totalPercent = 0
    let drawdownDays = 0

    for (const day of dailyPnls) {
        balance += day.pnl
        if (balance > peak) {
            peak = balance
        } else {
            const drawdown = peak - balance
            const percent = peak === 0 ? 0 : (drawdown / peak) * 100
            totalPercent += percent
            drawdownDays += 1
        }
    }

    if (drawdownDays === 0) return 0
    const avg = totalPercent / drawdownDays
    return round < 0 ? avg : _round(avg, round)
}
