<template>
	<div ref="chartContainer" class="w-full h-48 relative">
		<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
	</div>
</template>

<script setup lang="ts">
import type { EChartsFormatterParams } from '~/utils/echarts-builders'

type PieFormatterParams = EChartsFormatterParams & { color: string }

const { t } = useI18n()
const userStore = useDataStore()
const { profitColor, lossColor, breakevenColor, isDark } = useTypeColors()

const chartContainer = ref<HTMLDivElement | null>(null)

const chartFontFamily = computed(() => {
	if (!chartContainer.value) return echartsFontFamily
	return getComputedStyle(chartContainer.value).fontFamily || echartsFontFamily
	})

const totalTrades = computed(() => {
	const result = userStore.dashboardResult
	return (result?.winningTradesCount || 0) + (result?.breakevenTradesCount || 0) + (result?.losingTradesCount || 0)
})

const chartData = computed(() => {
	const result = userStore.dashboardResult
	const data: { value: number; name: string; itemStyle: { color: string } }[] = [
		{ value: result?.winningTradesCount || 0, name: t('components.dashboard.all_trades.winning'), itemStyle: { color: profitColor.value } },
		{ value: result?.losingTradesCount || 0, name: t('components.dashboard.all_trades.losing'), itemStyle: { color: lossColor.value } },
	]

	if (result?.breakevenTradesCount) {
		data.push({
			value: result.breakevenTradesCount,
			name: t('components.dashboard.all_trades.breakeven'),
			itemStyle: { color: breakevenColor.value },
		})
	}

	return data
})

const chartOption = computed(() => {
	const total = totalTrades.value
	const textColor = isDark.value ? '#e5e7eb' : '#1f2937'
	const borderColor = isDark.value ? '#1f2937' : '#ffffff'

	return {
		animation: true,
		animationDuration: 300,
		animationEasing: 'cubicOut',
		graphic: [
			getEchartsCenterTextGraphic(total.toString(), textColor, chartFontFamily.value),
		],
		tooltip: {
			trigger: 'item',
			backgroundColor: 'rgba(0, 0, 0, 0.8)',
			borderColor: 'transparent',
			textStyle: { color: '#e5e7eb', fontFamily: chartFontFamily.value, fontSize: 13 },
			appendTo: 'body',
			className: 'echarts-custom-tooltip',
			transitionDuration: 0,
			formatter: (params: unknown) => {
				const p = params as PieFormatterParams
				const value = p.value as number
				const name = p.name ?? ''
				const color = p.color
				const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
				const marker = `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color};margin-right:6px;"></span>`
				return `${marker}${name}: ${value} (${percentage}%)`
			},
		},
		series: [
			{
				type: 'pie' as const,
				radius: ['55%', '80%'],
				avoidLabelOverlap: false,
				itemStyle: {
					borderRadius: 4,
					borderColor,
					borderWidth: 2,
				},
				label: {
					show: true,
					position: 'inside',
					formatter: '{c}',
					fontSize: 12,
					fontWeight: 'bold',
					color: textColor,
					fontFamily: chartFontFamily.value,
				},
				emphasis: {
					focus: 'series',
					itemStyle: { color: 'inherit' },
				},
				data: chartData.value,
			},
		],
	}
})
</script>
