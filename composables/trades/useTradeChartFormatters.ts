import {
    type Time,
    type UTCTimestamp,
    TickMarkType,
} from 'lightweight-charts'

export const useTradeChartFormatters = () => {
	const userStore = useUserStore()
	const { locale } = useI18n()

	const displayTimezone = computed(() => {
		const s = userStore.user?.settings_object
		if (!s) return undefined
		if (s.timezoneDisplay === 'CURRENT') {
			return Intl.DateTimeFormat().resolvedOptions().timeZone
		} else if (s.timezoneDisplay === 'LOCAL') {
			return s.timezoneLocal
		} else if (s.timezoneDisplay === 'UTC') {
			const offset = s.timezoneUtcOffset ?? 0
			const sign = offset >= 0 ? '+' : '-'
			const hours = String(Math.abs(Math.floor(offset))).padStart(2, '0')
			const minutes = String(Math.abs((offset % 1) * 60)).padStart(2, '0')
			return `UTC${sign}${hours}:${minutes}`
		}
		return undefined
	})

	const intlLocale = computed(() => {
		const map = { fr: 'fr-FR', en: 'en-GB', us: 'en-US' }
		return map[locale.value as 'fr' | 'en' | 'us'] || 'fr-FR'
	})

	const formatChartTime = (ts: UTCTimestamp, withSeconds = false): string => {
		const date = new Date(ts * 1000)
		const opts: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			...(withSeconds ? { second: '2-digit' } : {}),
			...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
		}
		return new Intl.DateTimeFormat(intlLocale.value, opts).format(date)
	}

	const formatChartDate = (ts: UTCTimestamp): string => {
		const date = new Date(ts * 1000)
		return new Intl.DateTimeFormat(intlLocale.value, {
			day: '2-digit',
			month: 'short',
			...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
		}).format(date)
	}

	const formatChartMonth = (ts: UTCTimestamp): string => {
		const date = new Date(ts * 1000)
		return new Intl.DateTimeFormat(intlLocale.value, {
			month: 'short',
			year: 'numeric',
			...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
		}).format(date)
	}

	const formatChartYear = (ts: UTCTimestamp): string => {
		const date = new Date(ts * 1000)
		return new Intl.DateTimeFormat(intlLocale.value, {
			year: 'numeric',
			...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
		}).format(date)
	}

	const tickMarkFormatter = (time: Time, tickMarkType: TickMarkType): string | null => {
		if (typeof time === 'number') {
			const ts = time as UTCTimestamp
			switch (tickMarkType) {
				case TickMarkType.Year:
					return formatChartYear(ts)
				case TickMarkType.Month:
					return formatChartMonth(ts)
				case TickMarkType.DayOfMonth:
					return formatChartDate(ts)
				case TickMarkType.Time:
					return formatChartTime(ts, false)
				case TickMarkType.TimeWithSeconds:
					return formatChartTime(ts, true)
				default:
					return formatChartTime(ts, false)
			}
		}
		if (typeof time === 'string') return time
		return null
	}

	const crosshairTimeFormatter = (time: Time): string => {
		if (typeof time === 'number') {
			const ts = time as UTCTimestamp
			const date = new Date(ts * 1000)
			return new Intl.DateTimeFormat(intlLocale.value, {
				day: '2-digit',
				month: 'short',
				hour: '2-digit',
				minute: '2-digit',
				...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
			}).format(date)
		}
		if (typeof time === 'string') return time
		return ''
	}

	return {
		displayTimezone,
		intlLocale,
		formatChartTime,
		formatChartDate,
		formatChartMonth,
		formatChartYear,
		tickMarkFormatter,
		crosshairTimeFormatter,
	}
}
