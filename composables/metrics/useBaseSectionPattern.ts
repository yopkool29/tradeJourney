import { formatDurationMinutes, formatDateWithUserTimezone } from '~/utils/date-utils'

export const useMetricsBaseSectionPattern = () => {
	const { formatCurrency } = useUtils()
	const { locale } = useI18n()
	const userStore = useUserStore()
	const { dashBoardResult: result } = useDashboard()

	const timezoneKey = computed(() => {
		const settings = userStore.user?.settings_object
		return `${settings?.timezoneDisplay}-${settings?.timezoneLocal}-${settings?.timezoneUtcOffset}`
	})

	const formatDateOrDash = (date: Date | null, withHour: boolean = true): string => {
		void timezoneKey.value
		if (!date) return '—'
		return formatDateWithUserTimezone(date, userStore.user?.settings_object, withHour, locale.value as 'fr' | 'en' | 'us')
	}

	return {
		formatCurrency,
		formatDurationMinutes,
		formatDateOrDash,
		result,
	}
}
