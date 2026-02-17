import { describe, it, expect } from 'vitest'
import { parseISO8601Date, ImportMode } from '../utils/date-utils'

describe('parseISO8601Date - Standard CSV Date Parsing', () => {
    // Date de test : 2026-01-27T07:00:00.000Z (7h UTC)
    const testDateUTC = '2026-01-27T07:00:00.000Z'
    
    describe('Mode UTC with numeric offsets', () => {
        it('should parse UTC date without offset', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.UTC)
            expect(result.toISOString()).toBe('2026-01-27T07:00:00.000Z')
        })

        it('should apply UTC+8 offset (subtract 8 hours)', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.UTC, '8')
            expect(result.toISOString()).toBe('2026-01-26T23:00:00.000Z')
        })

        it('should apply UTC-5 offset (subtract -5 hours = add 5 hours)', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.UTC, '-5')
            expect(result.toISOString()).toBe('2026-01-27T12:00:00.000Z')
        })

        it('should apply UTC+0 offset (no change)', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.UTC, '0')
            expect(result.toISOString()).toBe('2026-01-27T07:00:00.000Z')
        })
    })

    describe('Mode LOCAL with IANA timezones', () => {
        it('should interpret date as Europe/Paris time (UTC+1 in winter)', () => {
            // 7h à Paris (UTC+1) = 6h UTC
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Europe/Paris')
            expect(result.toISOString()).toBe('2026-01-27T06:00:00.000Z')
        })

        it('should interpret date as Europe/Istanbul time (UTC+3)', () => {
            // 7h à Istanbul (UTC+3) = 4h UTC
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Europe/Istanbul')
            expect(result.toISOString()).toBe('2026-01-27T04:00:00.000Z')
        })

        it('should interpret date as America/New_York time (UTC-5 in winter)', () => {
            // 7h à New York (UTC-5) = 12h UTC
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'America/New_York')
            expect(result.toISOString()).toBe('2026-01-27T12:00:00.000Z')
        })

        it('should interpret date as Asia/Tokyo time (UTC+9)', () => {
            // 7h à Tokyo (UTC+9) = 22h UTC (la veille)
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Asia/Tokyo')
            expect(result.toISOString()).toBe('2026-01-26T22:00:00.000Z')
        })

        it('should interpret date as Australia/Sydney time (UTC+11 in summer)', () => {
            // 7h à Sydney (UTC+11 en janvier = été) = 20h UTC (la veille)
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Australia/Sydney')
            expect(result.toISOString()).toBe('2026-01-26T20:00:00.000Z')
        })

        it('should interpret date as Europe/London time (UTC+0 in winter)', () => {
            // 7h à Londres (UTC+0) = 7h UTC
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Europe/London')
            expect(result.toISOString()).toBe('2026-01-27T07:00:00.000Z')
        })
    })

    describe('Mode LOCAL with numeric offsets', () => {
        it('should apply offset +8 (subtract 8 hours)', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, '8')
            expect(result.toISOString()).toBe('2026-01-26T23:00:00.000Z')
        })

        it('should apply offset -5 (add 5 hours)', () => {
            const result = parseISO8601Date(testDateUTC, ImportMode.LOCAL, '-5')
            expect(result.toISOString()).toBe('2026-01-27T12:00:00.000Z')
        })
    })

    describe('DST (Daylight Saving Time) handling', () => {
        // Date d'été : 2026-07-27T07:00:00.000Z
        const summerDateUTC = '2026-07-27T07:00:00.000Z'

        it('should handle Europe/Paris DST (UTC+2 in summer)', () => {
            // Hiver (janvier) : UTC+1
            const winterResult = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Europe/Paris')
            expect(winterResult.toISOString()).toBe('2026-01-27T06:00:00.000Z')

            // Été (juillet) : UTC+2
            const summerResult = parseISO8601Date(summerDateUTC, ImportMode.LOCAL, 'Europe/Paris')
            expect(summerResult.toISOString()).toBe('2026-07-27T05:00:00.000Z')
        })

        it('should handle America/New_York DST (UTC-4 in summer)', () => {
            // Hiver (janvier) : UTC-5
            const winterResult = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'America/New_York')
            expect(winterResult.toISOString()).toBe('2026-01-27T12:00:00.000Z')

            // Été (juillet) : UTC-4
            const summerResult = parseISO8601Date(summerDateUTC, ImportMode.LOCAL, 'America/New_York')
            expect(summerResult.toISOString()).toBe('2026-07-27T11:00:00.000Z')
        })

        it('should handle Europe/Istanbul (no DST, always UTC+3)', () => {
            // Hiver : UTC+3
            const winterResult = parseISO8601Date(testDateUTC, ImportMode.LOCAL, 'Europe/Istanbul')
            expect(winterResult.toISOString()).toBe('2026-01-27T04:00:00.000Z')

            // Été : UTC+3 (pas de changement)
            const summerResult = parseISO8601Date(summerDateUTC, ImportMode.LOCAL, 'Europe/Istanbul')
            expect(summerResult.toISOString()).toBe('2026-07-27T04:00:00.000Z')
        })
    })

    describe('Edge cases', () => {
        it('should handle midnight UTC', () => {
            const midnight = '2026-01-27T00:00:00.000Z'
            const result = parseISO8601Date(midnight, ImportMode.LOCAL, 'Europe/Paris')
            expect(result.toISOString()).toBe('2026-01-26T23:00:00.000Z')
        })

        it('should handle end of day', () => {
            const endOfDay = '2026-01-27T23:59:59.000Z'
            const result = parseISO8601Date(endOfDay, ImportMode.LOCAL, 'Europe/Paris')
            expect(result.toISOString()).toBe('2026-01-27T22:59:59.000Z')
        })

        it('should handle dates without Z suffix in LOCAL mode', () => {
            const dateWithoutZ = '2026-01-27T07:00:00'
            const result = parseISO8601Date(dateWithoutZ, ImportMode.LOCAL, 'Europe/Paris')
            expect(result.toISOString()).toBe('2026-01-27T06:00:00.000Z')
        })
    })

    describe('Real-world scenarios', () => {
        it('should convert Tokyo trading hours (9:00 JST) to UTC', () => {
            // Ouverture du marché de Tokyo : 9h JST (UTC+9)
            const tokyoOpen = '2026-01-27T09:00:00.000Z'
            const result = parseISO8601Date(tokyoOpen, ImportMode.LOCAL, 'Asia/Tokyo')
            // 9h à Tokyo = 0h UTC
            expect(result.toISOString()).toBe('2026-01-27T00:00:00.000Z')
        })

        it('should convert New York trading hours (9:30 EST) to UTC', () => {
            // Ouverture du marché de New York : 9h30 EST (UTC-5 en hiver)
            const nyOpen = '2026-01-27T09:30:00.000Z'
            const result = parseISO8601Date(nyOpen, ImportMode.LOCAL, 'America/New_York')
            // 9h30 à New York = 14h30 UTC
            expect(result.toISOString()).toBe('2026-01-27T14:30:00.000Z')
        })

        it('should handle London trading hours (8:00 GMT) to UTC', () => {
            // Ouverture du marché de Londres : 8h GMT (UTC+0 en hiver)
            const londonOpen = '2026-01-27T08:00:00.000Z'
            const result = parseISO8601Date(londonOpen, ImportMode.LOCAL, 'Europe/London')
            // 8h à Londres = 8h UTC
            expect(result.toISOString()).toBe('2026-01-27T08:00:00.000Z')
        })
    })
})
