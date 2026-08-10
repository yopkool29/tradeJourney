<template>
    <div class="trade-chart-container">
        <div class="flex items-center gap-2 mb-2">
            <span class="text-secondary-sm font-semibold">{{ polygonSymbol }}</span>
            <USelect v-model="selectedTf" :items="tfOptions" size="xs" class="w-24" @update:model-value="onTfChange" />
            <UCheckbox v-model="showAdjacent" :label="$t('components.trade.chart.show_adjacent')" size="xs" @update:model-value="onAdjacentToggle" />
            <UCheckbox v-if="showAdjacent" v-model="showAdjacentLines" :label="$t('components.trade.chart.show_adjacent_lines')" size="xs" @update:model-value="onAdjacentLinesToggle" />
            <UCheckbox v-model="showRth" :label="$t('components.trade.chart.show_rth')" size="xs" @update:model-value="onRthToggle" />
            <UButton icon="i-heroicons-arrow-path" size="xs" color="neutral" variant="ghost" :loading="loading" @click="onReload" />
            <span v-if="loading" class="text-secondary-sm text-gray-500">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin inline" />
                {{ $t('common.loading') }}
            </span>
            <span v-if="error" class="text-secondary-sm text-red-500">{{ error }}</span>
        </div>
        <div v-show="!error" ref="chartContainer" class="w-full" style="height: 500px"></div>
    </div>
</template>

<script setup lang="ts">
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type Time,
    type UTCTimestamp,
    createSeriesMarkers,
} from 'lightweight-charts'
import { InstrumentType } from '~/type'
import type { TradeFilter } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'
import { tradeToPolygonSymbol, isFuturesSymbol } from '~/utils/polygonSymbol'
import type { PolygonBar } from '~/utils/polygonSymbol'
import { useTradeChartFormatters } from '~/composables/trades/useTradeChartFormatters'
import { useTradeChartHelpers } from '~/composables/trades/useTradeChartHelpers'

const props = defineProps<{
    trade: TradeExtendedType
    adjacentTrades: TradeExtendedType[]
}>()

const { t } = useI18n()
const isDark = useIsDark()
const colorMode = useColorMode()
const { symbols, getDigitFromSymbol } = useSymbols()
const { fetchTrades } = useTrades()

const { tickMarkFormatter, crosshairTimeFormatter } = useTradeChartFormatters()
const { getChartColors, findBarIndex, isInRange, addPriceSegment, clearPriceSegments, getVisibleBarsForTf } = useTradeChartHelpers()

// Safety net: deduplicate and sort bars by time before passing to the chart.
// The Polygon futures API can return multiple bars with the same window_start,
// and lightweight-charts requires strictly ascending unique timestamps.
const deduplicateAndSort = (bars: PolygonBar[]): PolygonBar[] => {
    const seen = new Map<number, PolygonBar>()
    for (const bar of bars) {
        seen.set(bar.time, bar)
    }
    return Array.from(seen.values()).sort((a, b) => a.time - b.time)
}

const chartAdjacentTrades = ref<TradeExtendedType[]>([])

const loadAdjacentTrades = async () => {
    const tradeSymbol = props.trade.symbol.toUpperCase()
    const tradeOpen = new Date(props.trade.openDate)
    const tradeClose = new Date(props.trade.closeDate)
    const windowMs = 90 * 24 * 60 * 60 * 1000
    const fromMs = tradeOpen.getTime() - windowMs
    const toMs = tradeClose.getTime() + windowMs

    const filters: TradeFilter[] = [
        { column: 'symbol', operator: '=', value: tradeSymbol },
        { column: 'openDate', operator: '>=', value: new Date(fromMs).toISOString() },
        { column: 'openDate', operator: '<=', value: new Date(toMs).toISOString() },
    ]

    const selectedAccountIds = dailyFilters.value.accountIds
    if (selectedAccountIds && selectedAccountIds.length > 0) {
        filters.push({ column: 'accountId', operator: 'in', value: selectedAccountIds })
    }

    const result = await fetchTrades(filters, 500, false)
    chartAdjacentTrades.value = result.filter(t => t.id !== props.trade.id)
}

const chartContainer = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref('')

const tfOptions = [
    { label: '1 min', value: '1' },
    { label: '5 min', value: '5' },
    { label: '15 min', value: '15' },
    { label: '1 hour', value: '60' },
    { label: '4 hours', value: '240' },
    { label: 'Daily', value: '1440' },
]
const dbStateStore = useDbStateStore()
const { tradeChartTf: selectedTf, tradeChartShowAdjacent: showAdjacent, tradeChartShowAdjacentLines: showAdjacentLines, dailyFilters } = storeToRefs(dbStateStore)

let chart: ReturnType<typeof createChart> | null = null
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null
let tradeLine: ISeriesApi<'Line'> | null = null
let seriesMarkers: ISeriesMarkersPluginApi<Time> | null = null
let priceSegments: ISeriesApi<'Line'>[] = []
let adjacentLines: ISeriesApi<'Line'>[] = []
let lastBars: PolygonBar[] = []

const symbolConfig = computed(() => symbols.value.find((s) => s.symbol === props.trade.symbol.toUpperCase()))
const polygonSymbolResult = computed(() => {
    const result = tradeToPolygonSymbol(props.trade.symbol, props.trade.instrumentType ?? InstrumentType.Any, symbolConfig.value)
    if (!result) {
        console.warn('[TradeChart] No Polygon symbol resolved', {
            tradeSymbol: props.trade.symbol,
            instrumentType: props.trade.instrumentType,
            hasSymbolConfig: !!symbolConfig.value,
        })
    }
    return result
})
const polygonSymbol = computed(() => polygonSymbolResult.value?.ticker ?? null)
const forcedInstrumentType = computed(() => polygonSymbolResult.value?.forcedInstrumentType ?? null)
const shouldRender = computed(() => polygonSymbol.value !== null)

// Resolve the effective instrument type for RTH preference lookup.
// Mirrors the logic in usePolygonBars.getRthSession.
const effectiveInstrumentType = computed(() => {
    if (forcedInstrumentType.value !== null) return forcedInstrumentType.value
    if (props.trade.instrumentType && props.trade.instrumentType !== InstrumentType.Any) return props.trade.instrumentType
    if (polygonSymbol.value !== null && isFuturesSymbol(polygonSymbol.value)) return InstrumentType.Future
    return InstrumentType.Any
})

// RTH toggle is persisted per instrument type, so the user can have RTH on for stocks
// but off for futures (or vice versa) without toggling every time.
const showRth = computed({
    get: () => dbStateStore.getTradeChartRth(effectiveInstrumentType.value),
    set: (val: boolean) => dbStateStore.setTradeChartRth(effectiveInstrumentType.value, val),
})

const { fetchBars, refetchBars } = usePolygonBars(polygonSymbol, props.trade, forcedInstrumentType, showRth)

const updateChartColors = () => {
    if (!chart || !candlestickSeries) return
    const colors = getChartColors()
    chart.applyOptions({
        layout: { background: colors.background, textColor: colors.textColor },
        grid: { vertLines: { color: colors.gridColor }, horzLines: { color: colors.gridColor } },
    })
    candlestickSeries.applyOptions({
        upColor: colors.upColor, downColor: colors.downColor,
        wickUpColor: colors.upColor, wickDownColor: colors.downColor,
    })
    if (tradeLine) tradeLine.applyOptions({ color: colors.lineColor })
    if (lastBars.length > 0) {
        if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
        addTradeMarkers(lastBars)
    }
}

const centerOnTrade = (data: PolygonBar[]) => {
    if (!chart || data.length === 0) return
    const entryTs = Math.floor(new Date(props.trade.openDate).getTime() / 1000)
    const exitTs = Math.floor(new Date(props.trade.closeDate).getTime() / 1000)
    const entryIdx = findBarIndex(data, entryTs)
    const exitIdx = findBarIndex(data, exitTs)
    const tradeMid = (entryIdx + exitIdx) / 2
    const visibleBars = getVisibleBarsForTf(Number(selectedTf.value))
    const from = Math.max(0, tradeMid - visibleBars)
    const to = tradeMid + visibleBars
    chart.timeScale().setVisibleLogicalRange({ from, to })
}

const addTradeMarkers = (data: PolygonBar[]) => {
    if (!candlestickSeries || data.length === 0) return
    const colors = getChartColors()
    const entryColor = props.trade.type === 'buy' ? colors.buyColor : colors.sellColor
    const exitColor = props.trade.type === 'buy' ? colors.sellColor : colors.buyColor
    const entryTs = Math.floor(new Date(props.trade.openDate).getTime() / 1000)
    const exitTs = Math.floor(new Date(props.trade.closeDate).getTime() / 1000)
    const entryInBounds = isInRange(data, entryTs)
    const exitInBounds = isInRange(data, exitTs)
    const entryIdx = findBarIndex(data, entryTs)
    const exitIdx = findBarIndex(data, exitTs)
    const entryTime = data[entryIdx].time as UTCTimestamp
    const exitTime = data[exitIdx].time as UTCTimestamp
    const monoColor = isDark.value ? '#ffffff' : '#000000'

    const markers: Array<{
        time: Time
        position: 'aboveBar' | 'belowBar'
        color: string
        shape: 'arrowUp' | 'arrowDown'
        text: string
    }> = []

    if (entryInBounds) {
        markers.push({ time: entryTime, position: 'belowBar', color: entryColor, shape: 'arrowUp', text: `${props.trade.type === 'buy' ? 'BUY' : 'SELL'} ${props.trade.lot}` })
    }
    if (exitInBounds) {
        markers.push({ time: exitTime, position: 'aboveBar', color: exitColor, shape: 'arrowDown', text: `EXIT ${props.trade.lot}` })
    }

    const sortedAdjacent = [...chartAdjacentTrades.value].sort((a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime())
    let visibleNumber = 1
    for (const adj of sortedAdjacent) {
        const adjEntryTs = Math.floor(new Date(adj.openDate).getTime() / 1000)
        const adjExitTs = Math.floor(new Date(adj.closeDate).getTime() / 1000)
        const adjEntryInBounds = isInRange(data, adjEntryTs)
        const adjExitInBounds = isInRange(data, adjExitTs)
        if (!adjEntryInBounds && !adjExitInBounds) continue
        const adjNumber = visibleNumber + 1
        visibleNumber++
        const adjEntryIdx = findBarIndex(data, adjEntryTs)
        const adjExitIdx = findBarIndex(data, adjExitTs)
        const adjEntryTime = data[adjEntryIdx].time as UTCTimestamp
        const adjExitTime = data[adjExitIdx].time as UTCTimestamp
        if (adjEntryInBounds) {
            markers.push({ time: adjEntryTime, position: 'belowBar', color: monoColor, shape: 'arrowUp', text: `[${adjNumber}] ${adj.type === 'buy' ? 'BUY' : 'SELL'} ${adj.lot}` })
        }
        if (adjExitInBounds) {
            markers.push({ time: adjExitTime, position: 'aboveBar', color: monoColor, shape: 'arrowDown', text: `[${adjNumber}] EXIT ${adj.lot}` })
        }
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number))

    if (seriesMarkers) {
        seriesMarkers.setMarkers(markers)
    } else {
        seriesMarkers = createSeriesMarkers(candlestickSeries, markers)
    }

    priceSegments = clearPriceSegments(chart, priceSegments)
    if (entryInBounds && chart) priceSegments = addPriceSegment(chart, data, entryIdx, props.trade.openPrice, entryColor, priceSegments)
    if (exitInBounds && chart) priceSegments = addPriceSegment(chart, data, exitIdx, props.trade.closePrice, exitColor, priceSegments)

    // Ligne reliant l'entry à l'exit du trade principal (uniquement si trade actif)
    if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
    if (entryInBounds && exitInBounds && chart && props.trade.active !== false) {
        tradeLine = chart.addSeries(LineSeries, {
            color: colors.lineColor,
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
            pointMarkersVisible: false,
        })
        tradeLine.setData([
            { time: entryTime, value: props.trade.openPrice },
            { time: exitTime, value: props.trade.closePrice },
        ])
    }

    for (const adj of sortedAdjacent) {
        const adjEntryTs = Math.floor(new Date(adj.openDate).getTime() / 1000)
        const adjExitTs = Math.floor(new Date(adj.closeDate).getTime() / 1000)
        const adjEntryInBounds = isInRange(data, adjEntryTs)
        const adjExitInBounds = isInRange(data, adjExitTs)
        const adjEntryIdx = findBarIndex(data, adjEntryTs)
        const adjExitIdx = findBarIndex(data, adjExitTs)
        if (adjEntryInBounds && chart) priceSegments = addPriceSegment(chart, data, adjEntryIdx, adj.openPrice, monoColor, priceSegments)
        if (adjExitInBounds && chart) priceSegments = addPriceSegment(chart, data, adjExitIdx, adj.closePrice, monoColor, priceSegments)
    }

    for (const series of adjacentLines) {
        if (chart) chart.removeSeries(series)
    }
    adjacentLines = []
    if (showAdjacentLines.value && chart) {
        for (const adj of sortedAdjacent) {
            const adjEntryTs = Math.floor(new Date(adj.openDate).getTime() / 1000)
            const adjExitTs = Math.floor(new Date(adj.closeDate).getTime() / 1000)
            const adjEntryInBounds = isInRange(data, adjEntryTs)
            const adjExitInBounds = isInRange(data, adjExitTs)
            if (!adjEntryInBounds || !adjExitInBounds) continue
            const adjEntryIdx = findBarIndex(data, adjEntryTs)
            const adjExitIdx = findBarIndex(data, adjExitTs)
            const line = chart.addSeries(LineSeries, {
                color: monoColor,
                lineWidth: 1,
                lineStyle: 2,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
                pointMarkersVisible: false,
            })
            line.setData([
                { time: data[adjEntryIdx].time as UTCTimestamp, value: adj.openPrice },
                { time: data[adjExitIdx].time as UTCTimestamp, value: adj.closePrice },
            ])
            adjacentLines.push(line)
        }
    }
}

let handleResize: (() => void) | null = null
let handleWheel: ((e: WheelEvent) => void) | null = null
let handleMouseEnter: (() => void) | null = null
let handleMouseLeave: (() => void) | null = null
let lockedScrollEl: HTMLElement | null = null

const findScrollableAncestor = (el: HTMLElement): HTMLElement | null => {
    let parent = el.parentElement
    while (parent) {
        const style = window.getComputedStyle(parent)
        if (/(auto|scroll|overlay)/.test(style.overflow + style.overflowY)) {
            return parent
        }
        parent = parent.parentElement
    }
    return null
}

const removeChartListeners = () => {
    if (handleResize) window.removeEventListener('resize', handleResize)
    if (chartContainer.value && handleWheel) chartContainer.value.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions)
    if (chartContainer.value && handleMouseEnter) chartContainer.value.removeEventListener('mouseenter', handleMouseEnter)
    if (chartContainer.value && handleMouseLeave) chartContainer.value.removeEventListener('mouseleave', handleMouseLeave)
    handleResize = null
    handleWheel = null
    handleMouseEnter = null
    handleMouseLeave = null
}

const initChart = async () => {
    if (!chartContainer.value) return
    if (!shouldRender.value) {
        error.value = t('components.trade.chart.no_symbol')
        return
    }

    const colors = getChartColors()

    chart = createChart(chartContainer.value, {
        layout: { background: colors.background, textColor: colors.textColor },
        localization: { timeFormatter: crosshairTimeFormatter },
        width: chartContainer.value.clientWidth,
        height: 500,
        timeScale: { timeVisible: true, secondsVisible: false, tickMarkFormatter },
        grid: { vertLines: { color: colors.gridColor }, horzLines: { color: colors.gridColor } },
        crosshair: { mode: 0 },
    })

    candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: colors.upColor, downColor: colors.downColor,
        borderVisible: false, wickUpColor: colors.upColor, wickDownColor: colors.downColor,
    })

    // Précision de l'axe des prix basée sur la config du symbol
    const pricePrecision = getDigitFromSymbol(props.trade.symbol, true)
    candlestickSeries.applyOptions({
        priceFormat: { type: 'price', precision: pricePrecision, minMove: 1 / Math.pow(10, pricePrecision) },
    })

    await loadChartData()

    if (!chartContainer.value || !chart) return

    const canvas = chartContainer.value?.querySelector('canvas')
    if (canvas) canvas.setAttribute('tabindex', '-1')

    handleResize = () => { if (chart && chartContainer.value) chart.applyOptions({ width: chartContainer.value.clientWidth }) }
    handleWheel = (e: WheelEvent) => { e.preventDefault() }
    handleMouseEnter = () => {
        if (!chartContainer.value) return
        lockedScrollEl = findScrollableAncestor(chartContainer.value)
        if (lockedScrollEl) {
            lockedScrollEl.dataset.prevOverflow = lockedScrollEl.style.overflow
            lockedScrollEl.style.overflow = 'hidden'
        }
    }
    handleMouseLeave = () => {
        if (lockedScrollEl) {
            lockedScrollEl.style.overflow = lockedScrollEl.dataset.prevOverflow || ''
            delete lockedScrollEl.dataset.prevOverflow
            lockedScrollEl = null
        }
    }

    if (!chartContainer.value) return

    window.addEventListener('resize', handleResize)
    chartContainer.value.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    chartContainer.value.addEventListener('mouseenter', handleMouseEnter)
    chartContainer.value.addEventListener('mouseleave', handleMouseLeave)
}

const loadChartData = async () => {
    if (!candlestickSeries) return
    loading.value = true
    error.value = ''
    try {
        const data = await fetchBars(selectedTf.value)
        if (data.length === 0) {
            error.value = t('components.trade.chart.no_data')
            return
        }
        const uniqueData = deduplicateAndSort(data)
        candlestickSeries.setData(uniqueData.map(bar => ({ ...bar, time: bar.time as UTCTimestamp })))
        lastBars = uniqueData
        addTradeMarkers(uniqueData)
        centerOnTrade(uniqueData)
    } catch (err) {
        const msg = (err as Error).message
        if (msg === 'RANGE_TOO_LARGE') error.value = t('components.trade.chart.range_too_large')
        else if (msg === 'MISSING_POLYGON_API_KEY') error.value = t('components.trade.chart.missing_api_key')
        else error.value = msg || t('components.trade.chart.error')
    } finally {
        loading.value = false
    }
}

const onTfChange = async () => {
    if (candlestickSeries) candlestickSeries.setData([])
    priceSegments = clearPriceSegments(chart, priceSegments)
    if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
    await loadChartData()
}

const onReload = async () => {
    if (!chart || !candlestickSeries) {
        error.value = ''
        await nextTick()
        await initChart()
        if (showAdjacent.value) {
            loadAdjacentTrades().then(() => { if (lastBars.length > 0) addTradeMarkers(lastBars) })
        }
        return
    }
    if (candlestickSeries) candlestickSeries.setData([])
    priceSegments = clearPriceSegments(chart, priceSegments)
    if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
    loading.value = true
    error.value = ''
    try {
        const data = await refetchBars(selectedTf.value)
        if (data.length === 0) {
            error.value = t('components.trade.chart.no_data')
            return
        }
        const uniqueData = deduplicateAndSort(data)
        candlestickSeries.setData(uniqueData.map(bar => ({ ...bar, time: bar.time as UTCTimestamp })))
        lastBars = uniqueData
        addTradeMarkers(uniqueData)
        centerOnTrade(uniqueData)
    } catch (err) {
        const msg = (err as Error).message
        if (msg === 'RANGE_TOO_LARGE') error.value = t('components.trade.chart.range_too_large')
        else if (msg === 'MISSING_POLYGON_API_KEY') error.value = t('components.trade.chart.missing_api_key')
        else error.value = msg || t('components.trade.chart.error')
    } finally {
        loading.value = false
    }
}

const destroyChart = () => {
    removeChartListeners()
    priceSegments = clearPriceSegments(chart, priceSegments)
    for (const series of adjacentLines) { if (chart) chart.removeSeries(series) }
    adjacentLines = []
    if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
    if (chart) { chart.remove(); chart = null }
    candlestickSeries = null
    seriesMarkers = null
    lastBars = []
    error.value = ''
    loading.value = false
}

let initInProgress = false
watch(() => props.trade.id, async () => {
    if (initInProgress) return
    initInProgress = true
    destroyChart()
    await nextTick()
    await initChart()
    if (showAdjacent.value) {
        loadAdjacentTrades().then(() => { if (lastBars.length > 0) addTradeMarkers(lastBars) })
    }
    initInProgress = false
}, { immediate: true })

onUnmounted(() => {
    removeChartListeners()
    if (chart) { chart.remove(); chart = null }
})

const onAdjacentLinesToggle = () => {
    if (lastBars.length > 0) addTradeMarkers(lastBars)
}

const onRthToggle = async () => {
    if (candlestickSeries) candlestickSeries.setData([])
    priceSegments = clearPriceSegments(chart, priceSegments)
    if (tradeLine && chart) { chart.removeSeries(tradeLine); tradeLine = null }
    await loadChartData()
}

const onAdjacentToggle = (val: boolean | 'indeterminate') => {
    const enabled = val === true
    showAdjacent.value = enabled
    if (enabled) {
        loadAdjacentTrades().then(() => { if (lastBars.length > 0) addTradeMarkers(lastBars) })
    } else {
        chartAdjacentTrades.value = []
        if (lastBars.length > 0) addTradeMarkers(lastBars)
    }
}

watch(() => colorMode.value, () => updateChartColors())
</script>
