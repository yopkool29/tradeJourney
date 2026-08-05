import { describe, it, expect } from 'vitest'
import {
	getTotalTradingDays,
	countBusinessDays,
	getBusinessDaysFromTrades,
	getWinningWeeksPercent,
	getWinningMonthsPercent,
} from '~/utils/dashboard'
import type { TradeExtendedType } from '~/schema/trade'

// Mock trades répartis sur plusieurs jours/semaines/mois
// Janvier 2024 : 01 (lundi, gagnant), 02 (mardi, gagnant), 03 (mercredi, perdant), 04 (jeudi, gagnant), 05 (vendredi, perdant)
// Février 2024 : 05 (lundi, gagnant), 06 (mardi, perdant)
// Mars 2024 : 01 (vendredi, gagnant), 15 (vendredi, perdant)
const mockTrades = [
	// Semaine 1 (01-05 jan 2024) : 3 gagnants, 2 perdants → semaine gagnante
	{ closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 95, lot: 1, commission: 5 },
	{ closeDate: '2024-01-02T10:30:00Z', profit: 50, netProfit: 45, lot: 1, commission: 5 },
	{ closeDate: '2024-01-03T12:00:00Z', profit: -80, netProfit: -85, lot: 2, commission: 5 },
	{ closeDate: '2024-01-04T11:00:00Z', profit: 200, netProfit: 190, lot: 1, commission: 10 },
	{ closeDate: '2024-01-05T10:15:00Z', profit: -30, netProfit: -35, lot: 1, commission: 5 },
	// Semaine 2 (05-06 fév 2024) : 1 gagnant, 1 perdant → semaine gagnante (95-85=+10)
	{ closeDate: '2024-02-05T11:00:00Z', profit: 100, netProfit: 95, lot: 1, commission: 5 },
	{ closeDate: '2024-02-06T10:30:00Z', profit: -80, netProfit: -85, lot: 1, commission: 5 },
	// Semaine 3 (01 mar 2024) : 1 gagnant → semaine gagnante
	{ closeDate: '2024-03-01T11:00:00Z', profit: 200, netProfit: 190, lot: 1, commission: 10 },
	// Semaine 4 (15 mar 2024) : 1 perdant → semaine perdante
	{ closeDate: '2024-03-15T12:00:00Z', profit: -100, netProfit: -105, lot: 1, commission: 5 },
] as unknown as TradeExtendedType[]

describe('dayStats', () => {
	describe('countBusinessDays', () => {
		it('should count weekdays between two dates (inclusive)', () => {
			// 01 jan (lundi) au 05 jan (vendredi) = 5 jours ouvrés
			expect(countBusinessDays(new Date('2024-01-01'), new Date('2024-01-05'))).toBe(5)
		})

		it('should exclude weekends', () => {
			// 01 jan (lundi) au 08 jan (lundi suivant) = 6 jours ouvrés (lun-mar-mer-jeu-ven + lun)
			expect(countBusinessDays(new Date('2024-01-01'), new Date('2024-01-08'))).toBe(6)
		})

		it('should return 0 if start > end', () => {
			expect(countBusinessDays(new Date('2024-01-05'), new Date('2024-01-01'))).toBe(0)
		})

		it('should return 1 for same day (weekday)', () => {
			expect(countBusinessDays(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(1)
		})

		it('should return 0 for same day (weekend)', () => {
			// 06 jan 2024 = samedi
			expect(countBusinessDays(new Date('2024-01-06'), new Date('2024-01-06'))).toBe(0)
		})
	})

	describe('getBusinessDaysFromTrades', () => {
		it('should count business days from first to last trade', () => {
			// Premier trade: 01 jan (lundi), dernier: 15 mar (vendredi)
			// Jours ouvrés du 01/01 au 15/03/2024
			// Janvier: 23 (23 jours ouvrés), Février: 21, Mars (1-15): 11 (excluant week-ends)
			// Total = 23 + 21 + 11 = 55
			const result = getBusinessDaysFromTrades(mockTrades)
			expect(result).toBeGreaterThan(0)
			expect(result).toBe(55)
		})

		it('should return 0 for empty trades', () => {
			expect(getBusinessDaysFromTrades([])).toBe(0)
		})

		it('should return 1 for single trade', () => {
			const single = [{ closeDate: '2024-01-01T11:00:00Z' }] as unknown as TradeExtendedType[]
			expect(getBusinessDaysFromTrades(single)).toBe(1)
		})
	})

	describe('getWinningWeeksPercent', () => {
		it('should calculate percentage of winning weeks', () => {
			// 4 semaines au total, 3 gagnantes (semaine 1: +210, semaine 2: +10, semaine 3: +190), 1 perdante (semaine 4: -105)
			// 3/4 = 75%
			const result = getWinningWeeksPercent(mockTrades, true, null)
			expect(result).toBe(75)
		})

		it('should return 0 for empty trades', () => {
			expect(getWinningWeeksPercent([], true, null)).toBe(0)
		})

		it('should return 100 when all weeks are winning', () => {
			const allWinning = [
				{ closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 100, lot: 1, commission: 0 },
				{ closeDate: '2024-01-08T11:00:00Z', profit: 50, netProfit: 50, lot: 1, commission: 0 },
			] as unknown as TradeExtendedType[]
			expect(getWinningWeeksPercent(allWinning, true, null)).toBe(100)
		})

		it('should return 0 when all weeks are losing', () => {
			const allLosing = [
				{ closeDate: '2024-01-01T11:00:00Z', profit: -100, netProfit: -100, lot: 1, commission: 0 },
				{ closeDate: '2024-01-08T11:00:00Z', profit: -50, netProfit: -50, lot: 1, commission: 0 },
			] as unknown as TradeExtendedType[]
			expect(getWinningWeeksPercent(allLosing, true, null)).toBe(0)
		})
	})

	describe('getWinningMonthsPercent', () => {
		it('should calculate percentage of winning months', () => {
			// 3 mois: janvier (+210 net), février (+10 net), mars (+85 net)
			// 3/3 = 100%
			const result = getWinningMonthsPercent(mockTrades, true, null)
			expect(result).toBe(100)
		})

		it('should return 0 for empty trades', () => {
			expect(getWinningMonthsPercent([], true, null)).toBe(0)
		})

		it('should calculate with mixed months', () => {
			const mixed = [
				// Janvier : gagnant
				{ closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 100, lot: 1, commission: 0 },
				// Février : perdant
				{ closeDate: '2024-02-01T11:00:00Z', profit: -50, netProfit: -50, lot: 1, commission: 0 },
			] as unknown as TradeExtendedType[]
			// 1 mois gagnant sur 2 = 50%
			expect(getWinningMonthsPercent(mixed, true, null)).toBe(50)
		})

		it('should return 100 when all months are winning', () => {
			const allWinning = [
				{ closeDate: '2024-01-01T11:00:00Z', profit: 100, netProfit: 100, lot: 1, commission: 0 },
				{ closeDate: '2024-02-01T11:00:00Z', profit: 50, netProfit: 50, lot: 1, commission: 0 },
			] as unknown as TradeExtendedType[]
			expect(getWinningMonthsPercent(allWinning, true, null)).toBe(100)
		})
	})

	describe('getTotalTradingDays', () => {
		it('should count unique trading days', () => {
			// mockTrades a 8 trades sur 8 jours différents
			const dailyPnls = [
				{ date: '2024-01-01', pnl: 95 },
				{ date: '2024-01-02', pnl: 45 },
				{ date: '2024-01-03', pnl: -85 },
				{ date: '2024-01-04', pnl: 190 },
			]
			expect(getTotalTradingDays(dailyPnls)).toBe(4)
		})

		it('should return 0 for empty array', () => {
			expect(getTotalTradingDays([])).toBe(0)
		})
	})
})
