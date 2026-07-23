<template>
    <DashboardChartsBaseWidgetCard
        :title="chartTitle"
        :enlarged-title="chartTitle + ' (enlarged)'"
        :chart-option="chartOption"
        :loading="loading"
        :modal-height-class="modalHeightClass"
        :subtitle="aggregationLabel"
    >
        <!-- Dropdown métrique dans le header (barMA et area) -->
        <template #header-extra>
            <div v-if="config.seriesType === 'barMA' || config.seriesType === 'area'" class="flex items-center gap-1.5">
                <span class="text-xs text-secondary">{{ $t('components.dashboard.breakdown.metric') }}</span>
                <USelectMenu v-model="selectedMetric" :items="metricItems" value-key="value" class="w-32" size="xs" />
            </div>
        </template>
        <!-- Menu settings : paramètres selon le type de chart -->
        <template #settings>
            <div class="space-y-2">
                <!-- Agrégation (sauf pour bar = par trade) -->
                <div v-if="config.seriesType !== 'bar'" class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{{ $t('components.dashboard.common.aggregation') }}</span>
                    <USelect v-model="aggregation" :items="aggregationOptions" size="sm" />
                </div>
                <!-- Max trades (bar = par trade seulement) -->
                <div v-if="config.seriesType === 'bar'" class="flex flex-col gap-1">
                    <span class="text-sm font-medium">{{ $t('components.dashboard.common.max_trades') }}</span>
                    <USelect v-model="maxTrades" :items="maxTradesOptions" size="sm" />
                </div>
                <!-- Show bars (barMA) -->
                <div v-if="config.seriesType === 'barMA'" class="flex items-center gap-2">
                    <UCheckbox v-model="showBars" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_bars') }}</span>
                </div>
                <!-- Show MA (barMA) -->
                <div v-if="config.seriesType === 'barMA'" class="flex items-center gap-2">
                    <UCheckbox v-model="showMovingAverage" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_moving_average') }}</span>
                </div>
                <!-- Show threshold (area + pnl seulement) -->
                <div v-if="config.seriesType === 'area' && config.metric === 'pnl'" class="flex items-center gap-2">
                    <UCheckbox v-model="showThreshold" />
                    <span class="text-sm">{{ $t('components.dashboard.common.show_threshold') }}</span>
                </div>
                <!-- Métriques supplémentaires dans le tooltip (barMA seulement) -->
                <div v-if="config.seriesType === 'barMA'" class="space-y-1 border-t border-gray-200 dark:border-gray-700 pt-2">
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
        <!-- Réticule : 2 boutons icônes à gauche du menu settings -->
        <template #header-actions>
            <button
                class="px-1.5 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                :class="crosshairType === 'cross' ? 'text-primary' : 'text-gray-400'"
                :title="$t('components.dashboard.common.crosshair_cross')"
                @click="crosshairType = 'cross'"
            >
                <UIcon name="i-lucide-cross" class="w-4 h-4" />
            </button>
            <button
                class="px-1.5 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                :class="crosshairType === 'line' ? 'text-primary' : 'text-gray-400'"
                :title="$t('components.dashboard.common.crosshair_line')"
                @click="crosshairType = 'line'"
            >
                <UIcon name="i-lucide-minus" class="w-4 h-4" />
            </button>
        </template>
    </DashboardChartsBaseWidgetCard>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import type { TimeSeriesConfig, TimeSeriesAggregation, BreakdownMetric } from '~/type'
import { calculateMetricsByDimension, getMetricValueForMetric, formatMetricValueForMetric } from '~/composables/useAnalytics'
import type { BreakdownMetrics } from '~/composables/useAnalytics'
import { metricOptions } from '~/composables/metrics/useBreakdownConfig'
import { buildBarData, buildBarSeries } from '~/utils/echarts-builders'
import type { EChartsFormatterParams, EChartsGridOption, EChartsAreaStyle } from '~/utils/echarts-builders'
import { chartColors, isMonetaryMetric } from '~/composables/useChartColors'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import { colorToRgba } from '~/utils/color-utils'
import { formatDateWithUserTimezone } from '~/utils/date-utils'
import type { TradeExtendedType } from '~/schema/trade'

const props = defineProps<{
    itemId: string
    loading?: boolean
    startingCapital?: number | null
}>()

// Récupère la config depuis breakdownConfigs (même mécanisme que BreakdownWidget)
const { activeWorkspace, updateActiveWorkspace } = useDashboardWorkspace()
const { t, locale } = useI18n()
const { displayModeNet } = useNetGrossDisplay()
const { formatCurrency } = useUtils()
const { canvasHeight } = useEchartsChart()
const isDark = useIsDark()
const dataStore = useDataStore()
const userStore = useUserStore()
const { getGroupedTrades } = useAggregationCache()

// Couleurs selon le type de chart (utilise les user settings comme les anciens composants)
const pnlColors = useTypeColors('pnlBarChart')
const timeSeriesColors = useTypeColors('timeSeriesChart')

const config = computed<TimeSeriesConfig>(() => {
    const configs = activeWorkspace.value?.breakdownConfigs || {}
    return (
        (configs[props.itemId] as TimeSeriesConfig) || {
            seriesType: 'bar',
            metric: 'pnl',
            chartType: 'timeSeries',
            maxTrades: 50,
            yAxisFormat: 'currency',
        }
    )
})

const updateConfig = (partial: Partial<TimeSeriesConfig>) => {
    const configs = { ...(activeWorkspace.value?.breakdownConfigs || {}) }
    configs[props.itemId] = { ...config.value, ...partial } as TimeSeriesConfig
    updateActiveWorkspace({ breakdownConfigs: configs } as never)
}

// --- Dropdown métrique dans le header ---
// En area : pnl → "P&L cumulé", appt → "APPT cumulé" ; les autres restent inchangés
const metricItems = computed(() => {
    const isArea = config.value.seriesType === 'area'
    return metricOptions.map((m) => {
        if (isArea && m.value === 'pnl') return { value: m.value, label: t('components.dashboard.cumulated_pnl_chart.title') }
        if (isArea && m.value === 'appt')
            return {
                value: m.value,
                label: t('components.dashboard.appt_chart.title') + ' (' + t('components.dashboard.index.cumulated_label') + ')',
            }
        return { value: m.value, label: t(m.labelKey) }
    })
})

const selectedMetric = computed<BreakdownMetric>({
    get: () => config.value.metric,
    set: (val: BreakdownMetric) => updateConfig({ metric: val }),
})

// --- Options pour les selects ---
type AggregationMode = 'day' | 'week' | 'month'

const aggregationOptions = computed(() => [
    { label: t('components.dashboard.index.by_day'), value: 'day' },
    { label: t('components.dashboard.index.by_week'), value: 'week' },
    { label: t('components.dashboard.index.by_month'), value: 'month' },
])

const maxTradesOptions = [
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
    { label: '200', value: 200 },
]

// --- v-model wrappers ---
const aggregation = computed<AggregationMode>({
    get: () => (config.value.aggregation as AggregationMode) ?? 'week',
    set: (val: AggregationMode) => updateConfig({ aggregation: val as TimeSeriesAggregation }),
})

const maxTrades = computed<number>({
    get: () => config.value.maxTrades ?? 50,
    set: (val: number) => updateConfig({ maxTrades: val }),
})

const showBars = computed<boolean>({
    get: () => config.value.showBars ?? true,
    set: (val: boolean) => updateConfig({ showBars: val }),
})

const showMovingAverage = computed<boolean>({
    get: () => config.value.showMovingAverage ?? true,
    set: (val: boolean) => updateConfig({ showMovingAverage: val }),
})

const showThreshold = computed<boolean>({
    get: () => config.value.showThreshold ?? true,
    set: (val: boolean) => updateConfig({ showThreshold: val }),
})

const crosshairType = computed<'cross' | 'line'>({
    get: () => config.value.crosshairType ?? 'cross',
    set: (val: 'cross' | 'line') => updateConfig({ crosshairType: val }),
})

// --- Métriques supplémentaires dans le tooltip (barMA seulement) ---
const selectedTooltipMetrics = computed<BreakdownMetric[]>(() => {
    const selected = config.value.tooltipMetrics ?? []
    const order = metricOptions.map(m => m.value)
    return [...selected].sort((a, b) => order.indexOf(a) - order.indexOf(b))
})

const toggleTooltipMetric = (metric: BreakdownMetric) => {
    const current = selectedTooltipMetrics.value
    const newVal = current.includes(metric)
        ? current.filter(m => m !== metric)
        : [...current, metric]
    updateConfig({ tooltipMetrics: newVal })
}

const buildExtraTooltipLines = (metrics: BreakdownMetrics, alreadyShown: Set<BreakdownMetric>): string[] => {
    const lines: string[] = []
    for (const m of selectedTooltipMetrics.value) {
        if (alreadyShown.has(m)) continue
        const val = getMetricValueForMetric(metrics, m)
        lines.push(`${t(`components.dashboard.breakdown.metrics.${m}`)}: ${formatMetricValueForMetric(val, m)}`)
    }
    return lines
}

// --- Titre ---
const chartTitle = computed(() => {
    const st = config.value.seriesType
    if (st === 'bar') return t('components.dashboard.pnl_bar_chart.title')
    // area et barMA : titre basé sur la métrique
    const m = config.value.metric
    const opt = metricOptions.find((o) => o.value === m)
    return opt ? t(opt.labelKey) : t('components.dashboard.appt_chart.title')
})

const modalHeightClass = computed(() => undefined)

// --- Subtitle (label d'agrégation) ---
const aggregationLabel = computed(() => {
    if (config.value.seriesType === 'bar') return undefined
    const opt = aggregationOptions.value.find((o) => o.value === aggregation.value)
    return opt?.label ?? ''
})

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

// --- Données cumulées (seriesType: 'area') ---
// --- Données area chart (seriesType: 'area') ---
// Cumul uniquement pour pnl et appt, valeur brute pour les autres métriques
const cumulatedData = computed(() => {
    if (config.value.seriesType !== 'area') return null
    const trades = dataStore.lastTrades || []
    if (!trades.length) return null
    const mode = aggregation.value
    const grouped = getGroupedTrades(mode)
    const useNet = displayModeNet.value
    const metric = config.value.metric
    const shouldCumulate = metric === 'pnl' || metric === 'appt'
    // Calcule la métrique pour chaque période
    const sortedKeys = Object.keys(grouped).sort()
    const labels: string[] = []
    const periodValues: number[] = []
    for (const key of sortedKeys) {
        const groupTrades = grouped[key]
        if (!groupTrades || groupTrades.length === 0) continue
        labels.push(key)
        const metrics = calculateMetricsByDimension(groupTrades as TradeExtendedType[], () => ['all'], useNet)[0]
        periodValues.push(metrics ? getMetricValueForMetric(metrics, metric) : 0)
    }
    // Cumul si pnl ou appt, sinon valeur brute
    const values = shouldCumulate
        ? periodValues.reduce((acc: number[], v) => {
              acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v)
              return acc
          }, [])
        : periodValues
    return { labels, values }
})

// --- Données agrégées par période (seriesType: 'barMA') ---
// Utilise calculateMetricsByDimension avec un groupFn par période pour calculer n'importe quelle métrique
const periodMetricsData = computed(() => {
    if (config.value.seriesType !== 'barMA') return null
    const trades: TradeExtendedType[] = dataStore.lastTrades || []
    if (!trades.length) return null
    const mode = aggregation.value
    const grouped = getGroupedTrades(mode)
    const useNet = displayModeNet.value
    // Calcule les métriques pour chaque groupe de période
    const labels: string[] = []
    const values: number[] = []
    const allMetrics: BreakdownMetrics[] = []
    const metric = config.value.metric
    // Trie les clés de période par ordre chronologique
    const sortedKeys = Object.keys(grouped).sort()
    for (const key of sortedKeys) {
        const groupTrades = grouped[key]
        if (!groupTrades || groupTrades.length === 0) continue
        labels.push(key)
        // Calcule la métrique pour ce groupe via calculateMetricsByDimension
        const metrics = calculateMetricsByDimension(groupTrades as TradeExtendedType[], () => ['all'], useNet)[0]
        if (!metrics) {
            values.push(0)
            allMetrics.push({} as BreakdownMetrics)
            continue
        }
        values.push(getMetricValueForMetric(metrics, metric))
        allMetrics.push(metrics)
    }
    // Calcule la moyenne mobile
    const maWindow = config.value.movingAverageWindow ?? 5
    const maValues: number[] = []
    for (let i = 0; i < values.length; i++) {
        const start = Math.max(0, i - maWindow + 1)
        const window = values.slice(start, i + 1)
        maValues.push(window.reduce((a, b) => a + b, 0) / window.length)
    }
    return { labels, values, maValues, allMetrics }
})

// --- Chart option ---
const chartOption = computed<EChartsOption | undefined>(() => {
    const st = config.value.seriesType
    const base = getEchartsBaseOption()
    const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
    const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()
    const grid: EChartsGridOption = { left: 70, right: 16, top: 12, bottom: 28 }
    const yFmt = yAxisFormatter.value
    const localeVal = locale.value as 'fr' | 'en' | 'us'

    // Configuration du réticule (crosshair) selon le type
    // Lignes pointillées + labels sur les axes
    // Light : lignes gris clair, labels fond gris foncé
    // Dark : lignes gris clair, labels fond gris foncé
    const pointerLineColor = isDark.value ? '#9ca3af' : '#888'
    const pointerLabelBg = isDark.value ? '#374151' : '#666'
    const axisPointerConfig =
        crosshairType.value === 'cross'
            ? {
                  type: 'cross' as const,
                  snap: true,
                  lineStyle: { color: pointerLineColor, type: 'dashed' as const },
                  crossStyle: { color: pointerLineColor, type: 'dashed' as const },
                  label: { show: true, color: '#fff', backgroundColor: pointerLabelBg },
              }
            : {
                  type: 'line' as const,
                  snap: true,
                  lineStyle: { color: pointerLineColor, type: 'dashed' as const },
                  label: { show: true, color: '#fff', backgroundColor: pointerLabelBg },
              }

    // --- PnL par trade : bar chart (seriesType: 'bar') ---
    if (st === 'bar' && pnlData.value) {
        const { labels, values, trades } = pnlData.value
        const { profitColor, lossColor, breakevenColor } = pnlColors
        const colors = values.map((v) => (v > 0 ? profitColor.value : v < 0 ? lossColor.value : breakevenColor.value))
        const data = buildBarData(values, colors, (v) => (v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]))
        const series = buildBarSeries({ data, barMaxWidth: 32, emphasis: { disabled: true } })
        return {
            ...base,
            tooltip: {
                backgroundColor,
                borderColor,
                textStyle: { color: tooltipTextColor, fontSize: 13 },
                appendTo: document.body,
                className: 'echarts-custom-tooltip',
                trigger: 'axis',
                axisPointer: axisPointerConfig,
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
            grid,
            xAxis: {
                type: 'category',
                data: labels,
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 11, interval: 0, rotate: labels.length > 30 ? 45 : 0 },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => yFmt(v) },
                splitLine: { lineStyle: { color: axisColor } },
            },
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
                backgroundColor,
                borderColor,
                textStyle: { color: tooltipTextColor, fontSize: 13 },
                appendTo: document.body,
                className: 'echarts-custom-tooltip',
                trigger: 'axis',
                axisPointer: axisPointerConfig,
                formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
                    const p = Array.isArray(params) ? params[0] : params
                    const valPair = p.value as unknown as [number, number]
                    const xi = Math.round(valPair[0])
                    const label = labels[xi] || ''
                    const val = valPair[1]
                    return [label ? `Date: ${label}` : '', `${t('components.dashboard.index.cumulated_label')}: ${yFmt(val)}`]
                        .filter(Boolean)
                        .join('<br/>')
                },
            },
            grid,
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
        if (showMovingAverage.value) {
            series.push({
                type: 'line',
                name: t('components.dashboard.index.mobile_avg_label'),
                data: maValues,
                smooth: 0.2,
                showSymbol: false,
                lineStyle: { color: maColor, width: 2 },
                itemStyle: { color: maColor },
            })
        }
        if (showBars.value) {
            series.push({
                type: 'bar',
                name: metricItems.value.find((m) => m.value === metric)?.label || metric,
                data: barValues.map((v) => ({
                    value: v,
                    itemStyle: {
                        color: canBeNegative ? (v >= 0 ? colors.profitColor.value : colors.lossColor.value) : barFill,
                        borderRadius: canBeNegative ? (v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]) : [3, 3, 0, 0],
                    },
                })),
                barMaxWidth: 32,
                emphasis: { disabled: true },
            })
        }

        const yMin = config.value.yAxisMin
        const yMax = config.value.yAxisMax

        // Formatage selon la métrique (même formatage que les breakdowns)
        const fmtVal = (val: number) => formatMetricValueForMetric(val, metric)

        return {
            ...base,
            tooltip: {
                backgroundColor,
                borderColor,
                textStyle: { color: tooltipTextColor, fontSize: 13 },
                appendTo: document.body,
                className: 'echarts-custom-tooltip',
                trigger: 'axis',
                axisPointer: axisPointerConfig,
                formatter: (params: EChartsFormatterParams | EChartsFormatterParams[]) => {
                    const list = (Array.isArray(params) ? params : [params]) as EChartsFormatterParams[]
                    const dataIndex = list[0]?.dataIndex ?? 0
                    const label = labels[dataIndex] || ''
                    const lines = list
                        .map((p) => {
                            const val = p.value as number
                            if (val === null || val === undefined) return null
                            return `${p.seriesName}: ${fmtVal(val)}`
                        })
                        .filter(Boolean)
                    // Ajoute les métriques supplémentaires depuis les données par période
                    const periodMetrics = allMetrics[dataIndex]
                    if (periodMetrics) {
                        const shown = new Set<BreakdownMetric>([metric])
                        lines.push(...buildExtraTooltipLines(periodMetrics, shown))
                    }
                    return [label ? `Date: ${label}` : '', ...lines].filter(Boolean).join('<br/>')
                },
            },
            grid,
            xAxis: {
                type: 'category',
                data: labels,
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 11, rotate: labels.length > 12 ? 30 : 0 },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                min: yMin,
                max: yMax,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: textColor, fontSize: 11, formatter: (v: number) => yFmt(v) },
                splitLine: { lineStyle: { color: axisColor } },
            },
            series,
        }
    }

    return undefined
})
</script>
