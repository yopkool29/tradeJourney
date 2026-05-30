import { describe, it, expect } from 'vitest'
import { DateTime } from 'luxon'

describe('NinjaTrader local timestamp conversion', () => {
    it('converts local NinjaTrader time -> UTC -> local (Europe/Paris)', () => {
        const localTimestamp = '15/01/2026 16:34:35'
        const timezone = 'Europe/Paris'

        const localDate = DateTime.fromFormat(localTimestamp, 'dd/LL/yyyy HH:mm:ss', {
            zone: timezone,
        })
        expect(localDate.isValid).toBe(true)

        const asUtc = localDate.toUTC()
        const roundTrip = asUtc.setZone(timezone)

        console.log('[NinjaTrader local]', localDate.toFormat('dd/LL/yyyy HH:mm:ss ZZZZ'))
        console.log('[Stored UTC]', asUtc.toISO())
        console.log('[Back to local]', roundTrip.toFormat('dd/LL/yyyy HH:mm:ss ZZZZ'))

        expect(roundTrip.toISO()).toBe(localDate.toISO())
        expect(asUtc.toISO()).toBe('2026-01-15T15:34:35.000Z')
    })
})
