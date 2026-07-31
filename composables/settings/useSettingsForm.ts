import type { SettingsContentType } from '~/schema/user'
import { defaultSettings } from '~/schema/user'

// Deep-merge saved chart colors with defaults, ensuring all nested keys exist.
const mergeChartColors = (saved: SettingsContentType['chartColors']): SettingsContentType['chartColors'] => {
	const d = defaultSettings.chartColors!
	return {
		tableRowHover: { ...d.tableRowHover, ...(saved?.tableRowHover || {}) },
		pnlchart: {
			line: { ...d.pnlchart.line, ...(saved?.pnlchart?.line || {}) },
			point: { ...d.pnlchart.point, ...(saved?.pnlchart?.point || {}) },
		},
		datalabels: {
			display: saved?.datalabels?.display ?? d.datalabels.display,
			light: saved?.datalabels?.light || d.datalabels.light,
			dark: saved?.datalabels?.dark || d.datalabels.dark,
			'light-blue': saved?.datalabels?.['light-blue'] || d.datalabels['light-blue'],
			'dark-gold': saved?.datalabels?.['dark-gold'] || d.datalabels['dark-gold'],
		},
		timeSeriesChart: {
			bar: { ...d.timeSeriesChart.bar, ...(saved?.timeSeriesChart?.bar || {}) },
			movingAverage: { ...d.timeSeriesChart.movingAverage, ...(saved?.timeSeriesChart?.movingAverage || {}) },
			rawMetric: { ...d.timeSeriesChart.rawMetric, ...(saved?.timeSeriesChart?.rawMetric || {}) },
		},
		heatmap: {
			min: { ...d.heatmap.min, ...(saved?.heatmap?.min || {}) },
			max: { ...d.heatmap.max, ...(saved?.heatmap?.max || {}) },
		},
		scatter2D: {
			min: { ...d.scatter2D.min, ...(saved?.scatter2D?.min || {}) },
			mid: { ...d.scatter2D.mid, ...(saved?.scatter2D?.mid || {}) },
			max: { ...d.scatter2D.max, ...(saved?.scatter2D?.max || {}) },
		},
		pnlBarChart: {
			profit: { ...d.pnlBarChart.profit, ...(saved?.pnlBarChart?.profit || {}) },
			loss: { ...d.pnlBarChart.loss, ...(saved?.pnlBarChart?.loss || {}) },
			breakeven: { ...d.pnlBarChart.breakeven, ...(saved?.pnlBarChart?.breakeven || {}) },
		},
		tradeTypeBadges: {
			buy: { ...d.tradeTypeBadges!.buy, ...(saved?.tradeTypeBadges?.buy || {}) },
			sell: { ...d.tradeTypeBadges!.sell, ...(saved?.tradeTypeBadges?.sell || {}) },
		},
	}
}

// Build the initial form state by deep-merging saved settings over defaults.
export const buildSettingsFormState = (saved: SettingsContentType): SettingsContentType => ({
	...defaultSettings,
	...saved,
	chartColors: mergeChartColors(saved.chartColors),
})

// Build a reset state that keeps non-display settings but resets display-related ones to defaults.
export const buildResetSettings = (current: SettingsContentType): SettingsContentType => ({
	...current,
	deleteConfirmationTrade: defaultSettings.deleteConfirmationTrade,
	deleteConfirmationNoteTags: defaultSettings.deleteConfirmationNoteTags,
	showCalendarDaily: defaultSettings.showCalendarDaily,
	showCalendarCalendar: defaultSettings.showCalendarCalendar,
	autoDataSync: defaultSettings.autoDataSync,
	showQuickNav: defaultSettings.showQuickNav,
	reverseDaysOrder: defaultSettings.reverseDaysOrder,
	syncAccountSelection: defaultSettings.syncAccountSelection,
	showTradeChart: defaultSettings.showTradeChart,
	showDetailedNote: defaultSettings.showDetailedNote,
	polygonApiKey: defaultSettings.polygonApiKey,
	pnlThreshold: defaultSettings.pnlThreshold,
	ninjaTraderApiPort: defaultSettings.ninjaTraderApiPort,
	ninjaTraderApiDays: defaultSettings.ninjaTraderApiDays,
	timezoneDisplay: defaultSettings.timezoneDisplay,
	timezoneLocal: defaultSettings.timezoneLocal,
	timezoneUtcOffset: defaultSettings.timezoneUtcOffset,
	chartColors: {
		tableRowHover: { ...defaultSettings.chartColors!.tableRowHover },
		pnlchart: {
			line: { ...defaultSettings.chartColors!.pnlchart.line },
			point: { ...defaultSettings.chartColors!.pnlchart.point },
		},
		datalabels: { ...defaultSettings.chartColors!.datalabels },
		timeSeriesChart: {
			bar: { ...defaultSettings.chartColors!.timeSeriesChart.bar },
			movingAverage: { ...defaultSettings.chartColors!.timeSeriesChart.movingAverage },
			rawMetric: { ...defaultSettings.chartColors!.timeSeriesChart.rawMetric },
		},
		heatmap: {
			min: { ...defaultSettings.chartColors!.heatmap.min },
			max: { ...defaultSettings.chartColors!.heatmap.max },
		},
		scatter2D: {
			min: { ...defaultSettings.chartColors!.scatter2D.min },
			mid: { ...defaultSettings.chartColors!.scatter2D.mid },
			max: { ...defaultSettings.chartColors!.scatter2D.max },
		},
		pnlBarChart: {
			profit: { ...defaultSettings.chartColors!.pnlBarChart.profit },
			loss: { ...defaultSettings.chartColors!.pnlBarChart.loss },
			breakeven: { ...defaultSettings.chartColors!.pnlBarChart.breakeven },
		},
		tradeTypeBadges: {
			buy: { ...defaultSettings.chartColors!.tradeTypeBadges!.buy },
			sell: { ...defaultSettings.chartColors!.tradeTypeBadges!.sell },
		},
	},
})
