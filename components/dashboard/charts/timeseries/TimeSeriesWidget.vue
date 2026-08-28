<template>
    <DashboardChartsBaseWidgetCard
        :title="chartTitle"
        :enlarged-title="chartTitle + ' (enlarged)'"
        :chart-option="chartOption"
        :loading="loading"
        :subtitle="aggregationLabel"
        @settings-open="onSettingsOpen"
        @settings-cancel="onSettingsCancel"
        @settings-apply="onSettingsApply"
    >
        <!-- Dropdown métrique dans le header (barMA et area) + toggle scrollX -->
        <template #header-extra>
            <div class="flex items-center gap-1.5 flex-wrap">
                <div v-if="config.seriesType === 'barMA' || config.seriesType === 'area'" class="flex items-center gap-1.5">
                    <span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.metric') }}</span>
                    <USelectMenu v-model="selectedMetric" :items="metricItems" value-key="value" class="w-32" size="xs" />
                </div>
                <div class="flex items-center gap-1.5">
                    <span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.scroll_x') }}</span>
                    <USwitch v-model="showScrollX" size="xs" />
                </div>
            </div>
        </template>
        <!-- Menu settings : paramètres selon le type de chart -->
        <template #settings>
            <div class="space-y-2">
                <!-- Agrégation (sauf pour bar = par trade) — draft validé au moment de l'apply -->
                <div v-if="config.seriesType !== 'bar'" class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{{ $t('components.dashboard.common.aggregation') }}</span>
                    <USelect v-model="draftAggregation" :items="aggregationOptions" size="sm" />
                </div>
                <!-- Max trades (bar = par trade seulement) -->
                <div v-if="config.seriesType === 'bar'" class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{{ $t('components.dashboard.common.max_trades') }}</span>
                    <USelect v-model="maxTrades" :items="maxTradesOptions" size="sm" />
                </div>
                <!-- Show bars (barMA) — draft validé au moment de l'apply -->
                <div v-if="config.seriesType === 'barMA'" class="flex items-center gap-2">
                    <UCheckbox v-model="draftShowBars" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_bars') }}</span>
                </div>
                <!-- Show MA (barMA) — draft validé au moment de l'apply -->
                <div v-if="config.seriesType === 'barMA'" class="flex items-center gap-2">
                    <UCheckbox v-model="draftShowMovingAverage" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_moving_average') }}</span>
                </div>
                <!-- Show threshold (area + pnl seulement) -->
                <div v-if="config.seriesType === 'area' && config.metric === 'pnl'" class="flex items-center gap-2">
                    <UCheckbox v-model="showThreshold" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_threshold') }}</span>
                </div>
                <!-- Métriques supplémentaires dans le tooltip (barMA et area) -->
                <div v-if="config.seriesType === 'barMA' || config.seriesType === 'area'" class="space-y-1 border-t border-default pt-2">
                    <span class="text-sm font-medium">{{ $t('components.dashboard.breakdown.tooltip_metrics') }}</span>
                    <div v-for="m in metricItems" :key="m.value" class="flex items-center gap-2">
                        <UCheckbox
                            :model-value="selectedTooltipMetrics.includes(m.value as BreakdownMetric)"
                            @update:model-value="toggleTooltipMetric(m.value as BreakdownMetric)"
                        />
                        <span class="text-sm">{{ m.label }}</span>
                    </div>
                </div>
            </div>
        </template>
        <!-- Réticule : 1 bouton toggle (cross ↔ line) -->
        <template #header-actions>
            <button
                class="px-1.5 py-1 rounded cursor-pointer hover:bg-accented focus:outline-none transition-colors text-primary"
                :title="crosshairType === 'cross' ? $t('components.dashboard.common.crosshair_cross') : $t('components.dashboard.common.crosshair_line')"
                @click="crosshairType = crosshairType === 'cross' ? 'line' : 'cross'"
            >
                <UIcon :name="crosshairType === 'cross' ? 'i-lucide-cross' : 'i-lucide-minus'" class="w-4 h-4" />
            </button>
        </template>
    </DashboardChartsBaseWidgetCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { BreakdownMetric } from '~/type'
import { calculateMetricsByDimension } from '~/composables/analytics/useAnalytics'
import { getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/analytics/breakdownMetrics'
import type { BreakdownMetrics } from '~/composables/analytics/breakdownMetrics'
import { buildTooltipLines, useTooltipMetrics } from '~/composables/charts/useTooltipMetrics'
import { buildBarData, buildBarSeries, buildLineSeries, buildBarColors, colorToRgba, chartColors, isMonetaryMetric } from '~/utils/dashboard'
import type { EChartsFormatterParams, EChartsAreaStyle } from '~/utils/dashboard'
import { formatDateWithUserTimezone } from '~/utils/date-utils'
import type { TradeExtendedType } from '~/schema/trade'
import { useTimeSeriesConfig } from '~/composables/charts/useTimeSeriesConfig'

const props = defineProps<{
    itemId: string
    loading?: boolean
    startingCapital?: number | null
}>()

const { t, locale } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const dataStore = useDataStore()
const userStore = useUserStore()
const { getGroupedTrades } = useAggregationCache()

// Couleurs selon le type de chart (utilise les user settings comme les anciens composants)
const pnlColors = useTypeColors('pnlBarChart')
const timeSeriesColors = useTypeColors('timeSeriesChart')

const {
    config, updateConfig,
    draftAggregation, draftShowBars, draftShowMovingAverage,
    onSettingsOpen, onSettingsCancel, onSettingsApply,
    metricItems, selectedMetric,
    aggregationOptions, maxTradesOptions,
    aggregation, maxTrades, showBars, showMovingAverage,
    showThreshold, crosshairType, showScrollX,
    chartTitle, aggregationLabel,
} = useTimeSeriesConfig(props.itemId)

// --- Métriques supplémentaires dans le tooltip (barMA seulement) ---
const { selectedTooltipMetrics, toggleTooltipMetric } = useTooltipMetrics(config, updateConfig)

// --- Formatage axe Y (utilise le même formatage que les breakdowns) ---
const yAxisFormatter = computed<(v: number) => string>(() => {
    const metric = config.value.metric
    return (v: number) => formatMetricValueForMetric(v, metric)
})

// --- Données PnL par trade (seriesType: 'bar') ---
const pnlData = computed(() => {
    if (config.value.seriesType !== 'bar') return null
    const trades: TradeExtendedType[] = dataStore.lastTrades || []
    const sorted = [...trades].sort((a, b) => {
        const aClose = a.closeDate ? new Date(a.closeDate).getTime() : 0
        const bClose = b.closeDate ? new Date(b.closeDate).getTime() : 0
        if (aClose !== bClose) return aClose - bClose
        const aOpen = a.openDate ? new Date(a.openDate).getTime() : 0
        const bOpen = b.openDate ? new Date(b.openDate).getTime() : 0
        if (aOpen !== bOpen) return aOpen - bOpen
        return (a.id || 0) - (b.id || 0)
    })
    const max = config.value.maxTrades ?? 50
    const display = sorted.slice(-max)
    return {
        trades: display,
        labels: display.map((_, i) => `#${i + 1}`),
        values: display.map((tr) => (displayModeNet.value ? tr.netProfit || 0 : tr.profit || 0)),
    }
})

const getPeriodMetrics = () => {
    const trades: TradeExtendedType[] = dataStore.lastTrades || []
    if (!trades.length) return null
    const grouped = getGroupedTrades(aggregation.value)
    const metric = config.value.metric
    const labels: string[] = []
    const values: number[] = []
    const allMetrics: BreakdownMetrics[] = []
    for (const key of Object.keys(grouped).sort()) {
        const groupTrades = grouped[key]
        if (!groupTrades?.length) continue
        labels.push(key)
        const metrics = calculateMetricsByDimension(groupTrades as TradeExtendedType[], () => ['all'], displayModeNet.value)[0]
        values.push(metrics ? getMetricValueForMetric(metrics, metric) : 0)
        allMetrics.push(metrics || ({} as BreakdownMetrics))
    }
    return { labels, values, allMetrics }
}

// Cumul uniquement pour pnl, valeur brute pour les autres métriques
const shouldCumulate = computed(() => config.value.metric === 'pnl')
const cumulatedData = computed(() => {
    if (config.value.seriesType !== 'area') return null
    const periodMetrics = getPeriodMetrics()
    if (!periodMetrics) return null
    const values = shouldCumulate.value
        ? periodMetrics.values.reduce<number[]>((acc, value) => [...acc, (acc[acc.length - 1] || 0) + value], [])
        : periodMetrics.values
    return { ...periodMetrics, values }
})

const periodMetricsData = computed(() => {
    if (config.value.seriesType !== 'barMA') return null
    const periodMetrics = getPeriodMetrics()
    if (!periodMetrics) return null
    const maWindow = config.value.movingAverageWindow ?? 5
    const maValues = periodMetrics.values.map((_, index, values) => {
        const window = values.slice(Math.max(0, index - maWindow + 1), index + 1)
        return window.reduce((sum, value) => sum + value, 0) / window.length
    })
    return { ...periodMetrics, maValues }
})

// --- Chart option ---
const createCategoryAxis = (labels: string[], rotate: number, axisColor: string, textColor: string, interval: number | 'auto' = 0) => ({
    type: 'category' as const,
    data: labels,
    axisLine: { lineStyle: { color: axisColor } },
    axisTick: { show: false },
    axisLabel: { color: textColor, fontSize: 11, interval, rotate },
    splitLine: { show: false },
})

const createValueAxis = (yFmt: (value: number) => string, axisColor: string, textColor: string) => ({
    type: 'value' as const,
    axisLine: { lineStyle: { color: axisColor } },
    axisTick: { show: false },
    axisLabel: { color: textColor, fontSize: 11, formatter: yFmt },
    splitLine: { lineStyle: { color: axisColor } },
})

const { getChartContext, getCrosshairConfig, buildTooltip } = useEchartsChartOption()
const chartOption = computed<EChartsOption | undefined>(() => {
    const st = config.value.seriesType
    const ctx = getChartContext()
    const { base, axisColor, textColor, grid } = ctx
    const yFmt = yAxisFormatter.value
    const localeVal = locale.value as 'fr' | 'en' | 'us'
    const axisPointerConfig = getCrosshairConfig(crosshairType.value)

    const scrollXEnabled = showScrollX.value
    const chartGrid = scrollXEnabled ? { ...grid, bottom: 40 } : grid
    const dataZoom = [
        { type: 'inside' as const, xAxisIndex: 0, filterMode: 'filter', start: 0, end: 100, moveOnMouseWheel: 'shift', zoomOnMouseWheel: false },
        { type: 'slider' as const, xAxisIndex: 0, show: scrollXEnabled, start: 0, end: 100, height: 20, bottom: 5, filterMode: 'filter' },
    ]

    // --- PnL par trade : bar chart (seriesType: 'bar') ---
    if (st === 'bar' && pnlData.value) {
        const { labels, values, trades } = pnlData.value
        const { profitColor, lossColor, breakevenColor } = pnlColors
        const colors = buildBarColors(values, profitColor.value, lossColor.value, breakevenColor.value)
        const data = buildBarData(values, colors, (v) => (v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]))
        const series = buildBarSeries({ data, barMaxWidth: 32, emphasis: { disabled: true } })
        return {
            ...base,
            tooltip: {
                ...buildTooltip(ctx, axisPointerConfig),
                formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
                    const p = Array.isArray(params) ? params[0] : params
                    const trade = trades[p.dataIndex]
                    if (!trade) return ''
                    const val = p.value as number
                    let date = ''
                    if (trade.closeDate) {
                        date = formatDateWithUserTimezone(trade.closeDate, userStore.user?.settings_object || {}, true, localeVal)
                    }
                    return [date ? `Date: ${date}` : '', `P&L: ${formatCurrency(val)}`, trade.account_displayName || ''].filter(Boolean).join('<br/>')
                },
            },
            grid: chartGrid,
            dataZoom,
            xAxis: createCategoryAxis(labels, labels.length > 30 ? 45 : 0, axisColor, textColor, labels.length > 30 ? 'auto' : 0),
            yAxis: createValueAxis(yFmt, axisColor, textColor),
            series,
        }
    }

    // --- Cumulated : area chart (seriesType: 'area') ---
    if (st === 'area' && cumulatedData.value) {
        const baseLabels = cumulatedData.value.labels
        const baseValues = cumulatedData.value.values
        const metric = config.value.metric
        const monetary = isMonetaryMetric(metric)

        // Pour les métriques monétaires : vert/rouge (profit/loss)
        // Pour les pourcentages (winrate) : barColor (jaune)
        // Pour les métriques brutes (durée, compteur) : rawMetricColor (bleu)
        const { profitColor, lossColor } = pnlColors
        const { barColor, rawMetricColor } = timeSeriesColors
        const isRawMetric = metric === 'avgDuration' || metric === 'tradesCount'
        const uniformColor = isRawMetric ? (rawMetricColor.value || chartColors.neutral) : (barColor.value || chartColors.neutral)
        const pColor = monetary ? profitColor.value : uniformColor
        const lColor = monetary ? lossColor.value : uniformColor
        const pAreaColor = colorToRgba(pColor, 0.3)
        const lAreaColor = colorToRgba(lColor, 0.3)

        // Le threshold ne s'applique qu'au P&L cumulé, ignoré pour les autres métriques
        const useThreshold = showThreshold.value && metric === 'pnl'
        const capital = useThreshold ? props.startingCapital || 0 : 0
        const threshold = capital

        const labels = capital > 0 ? ['', ...baseLabels] : baseLabels
        const values = capital > 0 ? [capital, ...baseValues.map((v) => v + capital)] : baseValues

        // Sépare les points profit/loss avec points de croisement (comme BaseCumulatedLineChart)
        type DataPoint = { value: [number, number]; itemStyle?: { opacity: number }; symbolSize?: number } | null
        const profitData: DataPoint[] = []
        const lossData: DataPoint[] = []

        for (let i = 0; i < values.length; i++) {
            const v = values[i]
            const prev = i > 0 ? values[i - 1] : undefined
            if (prev !== undefined) {
                const crossedUp = prev < threshold && v >= threshold
                const crossedDown = prev >= threshold && v < threshold
                if (crossedUp || crossedDown) {
                    const tRatio = (threshold - prev) / (v - prev)
                    const xi = i - 1 + tRatio
                    const crossingPoint = { value: [xi, threshold] as [number, number], itemStyle: { opacity: 0 }, symbolSize: 0 }
                    profitData.push(crossingPoint)
                    lossData.push(crossingPoint)
                }
            }
            const point = { value: [i, v] as [number, number] }
            if (v >= threshold) {
                profitData.push(point)
                lossData.push(null)
            } else {
                lossData.push(point)
                profitData.push(null)
            }
        }

        const largeDataset = values.length > 500
        const seriesBase = {
            type: 'line' as const,
            smooth: false,
            symbol: 'none',
            showSymbol: false,
            symbolSize: 0,
            connectNulls: false,
            emphasis: { disabled: true },
            blur: { lineStyle: { opacity: 1 }, areaStyle: { opacity: 0.3 } },
            ...(largeDataset && { sampling: 'lttb' as const, progressive: 500, progressiveThreshold: 500 }),
        }

        return {
            ...base,
            animation: false,
            tooltip: {
                ...buildTooltip(ctx, axisPointerConfig),
                formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
                    const allParams = Array.isArray(params) ? params : [params]
                    // Filtre les points de croisement artificiels (x fractionnaire) pour ne garder que les vrais points
                    const realParams = allParams.filter((p) => Number.isInteger((p.value as unknown as [number, number])[0]))
                    const p = realParams[0] || allParams[0]
                    const valPair = p.value as unknown as [number, number]
                    const xi = Math.round(valPair[0])
                    const label = labels[xi] || ''
                    const val = valPair[1]
                    const valueLabel = shouldCumulate.value
                        ? t('components.dashboard.index.cumulated_label')
                        : t(`components.dashboard.breakdown.metrics.${metric}`)
                    const primaryLines = [label ? `Date: ${label}` : '', `${valueLabel}: ${yFmt(val)}`].filter(Boolean)
                    // Ajoute les métriques supplémentaires depuis les données par période
                    const allMetrics = cumulatedData.value?.allMetrics
                    let periodMetrics: BreakdownMetrics | undefined
                    if (allMetrics) {
                        // Si capital > 0, le premier point (xi=0) est artificiel, on décale
                        const metricIndex = capital > 0 ? xi - 1 : xi
                        periodMetrics = allMetrics[metricIndex]
                    }
                    return buildTooltipLines('', primaryLines, periodMetrics, new Set([metric]), selectedTooltipMetrics.value, t)
                },
            },
            grid: chartGrid,
            dataZoom,
            xAxis: {
                type: 'value',
                min: 0,
                max: labels.length - 1,
                boundaryGap: [0, 0] as [number, number],
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    formatter: (v: number) => labels[Math.round(v)] ?? '',
                },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                scale: true,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => yFmt(v) },
                splitLine: { lineStyle: { color: axisColor } },
            },
            series: [
                {
                    ...seriesBase,
                    name: 'Cumulated',
                    data: profitData,
                    lineStyle: { width: 2, color: pColor },
                    itemStyle: { color: pColor },
                    areaStyle: { origin: threshold, color: pAreaColor } as EChartsAreaStyle,
                },
                {
                    ...seriesBase,
                    name: 'Cumulated',
                    data: lossData,
                    lineStyle: { width: 2, color: lColor },
                    itemStyle: { color: lColor },
                    areaStyle: { origin: threshold, color: lAreaColor } as EChartsAreaStyle,
                    markLine:
                        threshold > 0
                            ? {
                                  silent: true,
                                  symbol: 'none',
                                  lineStyle: { color: axisColor, type: 'dashed', width: 1 },
                                  data: [{ yAxis: threshold }],
                                  label: { show: false },
                              }
                            : undefined,
                },
            ],
        }
    }

    // --- BarMA : barres + moyenne mobile (seriesType: 'barMA') ---
    if (st === 'barMA' && periodMetricsData.value) {
        const { labels, values: barValues, maValues, allMetrics } = periodMetricsData.value
        const metric = config.value.metric

        // Couleurs génériques pour les séries temporelles (bar + MA)
        const colors = timeSeriesColors
        const maColor = colors.movingAverageColor.value || chartColors.neutral
        // Pour les barres : vert/rouge si la métrique est monétaire (pnl, appt, etc.), sinon couleur uniforme
        const canBeNegative = isMonetaryMetric(metric)
        // barColor (jaune) pour les pourcentages (winrate), rawMetricColor (bleu) pour les métriques brutes (durée, compteur)
        const isRawMetric = metric === 'avgDuration' || metric === 'tradesCount'
        const barFill = isRawMetric ? (colors.rawMetricColor.value || chartColors.neutral) : (colors.barColor.value || chartColors.profit)

        const series: EChartsOption['series'] = []
        // MA : toujours ajoutée pour garder les données dans le tooltip, transparente si désactivée
        series.push(buildLineSeries({
            name: t('components.dashboard.index.mobile_avg_label'),
            data: maValues,
            color: maColor,
            symbolSize: 0,
            smooth: 0.2,
            lineStyle: showMovingAverage.value ? { width: 2, color: maColor, opacity: 1 } : { width: 0, opacity: 0 },
            itemStyle: { color: maColor, opacity: showMovingAverage.value ? 1 : 0 },
        }))
        // Barres : toujours ajoutées pour garder les données dans le tooltip, transparentes si désactivées
        series.push({
            type: 'bar',
            name: metricItems.value.find((m) => m.value === metric)?.label || metric,
            data: barValues.map((v) => ({
                value: v,
                itemStyle: {
                    color: showBars.value
                        ? (canBeNegative ? (v >= 0 ? colors.profitColor.value : colors.lossColor.value) : barFill)
                        : 'rgba(0,0,0,0)',
                    borderRadius: canBeNegative ? (v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]) : [3, 3, 0, 0],
                },
            })),
            barMaxWidth: 32,
            emphasis: { disabled: true },
        })

        const yMin = config.value.yAxisMin
        const yMax = config.value.yAxisMax

        // Formatage selon la métrique (même formatage que les breakdowns)
        const fmtVal = (val: number) => formatMetricValueForMetric(val, metric)

        return {
            ...base,
            tooltip: {
                ...buildTooltip(ctx, axisPointerConfig),
                formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
                    const list = (Array.isArray(params) ? params : [params]) as EChartsFormatterParams[]
                    const dataIndex = list[0]?.dataIndex ?? 0
                    const label = labels[dataIndex] || ''
                    const seriesLines = list
                        .map((p) => {
                            const val = p.value as number
                            if (val === null || val === undefined) return null
                            return `${p.seriesName}: ${fmtVal(val)}`
                        })
                        .filter(Boolean) as string[]
                    const periodMetrics = allMetrics[dataIndex]
                    const primaryLines = [label ? `Date: ${label}` : '', ...seriesLines].filter(Boolean)
                    return buildTooltipLines('', primaryLines, periodMetrics, new Set([metric]), selectedTooltipMetrics.value, t)
                },
            },
            grid: chartGrid,
            dataZoom,
            xAxis: createCategoryAxis(labels, labels.length > 12 ? 30 : 0, axisColor, textColor, labels.length > 20 ? 'auto' : 0),
            yAxis: {
                ...createValueAxis(yFmt, axisColor, textColor),
                min: yMin,
                max: yMax,
                axisLine: { show: false },
            },
            series,
        }
    }

    return undefined
})
</script>
