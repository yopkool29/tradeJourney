<template>
    <div class="trade-chart-container">
        <div class="flex items-center gap-2 mb-2">
            <span class="text-secondary-sm font-semibold">{{ polygonSymbol }}</span>
            <USelect v-model="selectedTf" :items="tfOptions" size="xs" class="w-24" @update:model-value="onTfChange" />
            <UCheckbox v-model="showAdjacent" :label="$t('components.trade.chart.show_adjacent')" size="xs" @update:model-value="onAdjacentToggle" />
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
    ColorType,
    CandlestickSeries,
    LineSeries,
    TickMarkType,
    type ISeriesApi,
    type ISeriesMarkersPluginApi,
    type Time,
    type UTCTimestamp,
    createSeriesMarkers,
} from 'lightweight-charts'
import { InstrumentType } from '~/type'
import type { TradeFilter } from '~/type'
import type { TradeExtendedType } from '~/schema/trade'
import { tradeToPolygonSymbol } from '~/utils/polygonSymbol'
import type { PolygonBar } from '~/utils/polygonSymbol'

const props = defineProps<{
    trade: TradeExtendedType
    adjacentTrades: TradeExtendedType[]
}>()

const { t, locale } = useI18n()
const isDark = useIsDark()
const colorMode = useColorMode()
const { symbols } = useSymbols()
const userStore = useUserStore()
const { fetchTrades } = useTrades()

// Adjacent trades: fetched from the API for the same symbol within a wide date range
// around the current trade. This includes trades opened on different days that would
// still be visible on the chart (e.g. a trade opened 3 weeks earlier on daily timeframe).
const chartAdjacentTrades = ref<TradeExtendedType[]>([])

const loadAdjacentTrades = async () => {
    const tradeSymbol = props.trade.symbol.toUpperCase()
    const tradeOpen = new Date(props.trade.openDate)
    const tradeClose = new Date(props.trade.closeDate)

    // Wide window (±90 days) to cover daily timeframe context
    const windowMs = 90 * 24 * 60 * 60 * 1000
    const fromMs = tradeOpen.getTime() - windowMs
    const toMs = tradeClose.getTime() + windowMs

    const filters: TradeFilter[] = [
        { column: 'symbol', operator: '=', value: tradeSymbol },
        { column: 'openDate', operator: '>=', value: new Date(fromMs).toISOString() },
        { column: 'openDate', operator: '<=', value: new Date(toMs).toISOString() },
    ]

    // Filter by selected accounts in daily filters, if any
    const selectedAccountIds = dailyFilters.value.accountIds
    if (selectedAccountIds && selectedAccountIds.length > 0) {
        filters.push({ column: 'accountId', operator: 'in', value: selectedAccountIds })
    }

    const result = await fetchTrades(filters, 500, true)
    chartAdjacentTrades.value = result.filter(t => t.id !== props.trade.id)
}

// Resolve the Intl timezone string from user settings (CURRENT/LOCAL/UTC modes)
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

// Format a UTCTimestamp (seconds) for the chart axis / crosshair using user timezone
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

// Format a UTCTimestamp as a date (day + month) for the chart axis
const formatChartDate = (ts: UTCTimestamp): string => {
    const date = new Date(ts * 1000)
    return new Intl.DateTimeFormat(intlLocale.value, {
        day: '2-digit',
        month: 'short',
        ...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
    }).format(date)
}

// Format a UTCTimestamp as month + year for the chart axis
const formatChartMonth = (ts: UTCTimestamp): string => {
    const date = new Date(ts * 1000)
    return new Intl.DateTimeFormat(intlLocale.value, {
        month: 'short',
        year: 'numeric',
        ...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
    }).format(date)
}

// Format a UTCTimestamp as year for the chart axis
const formatChartYear = (ts: UTCTimestamp): string => {
    const date = new Date(ts * 1000)
    return new Intl.DateTimeFormat(intlLocale.value, {
        year: 'numeric',
        ...(displayTimezone.value ? { timeZone: displayTimezone.value } : {}),
    }).format(date)
}

// tickMarkFormatter for the chart time scale: formats labels in user timezone
const tickMarkFormatter = (time: Time, tickMarkType: TickMarkType): string | null => {
    // Time can be a UTCTimestamp (number) or a business day string (for daily data)
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
    // For business day strings (daily timeframe), return as-is
    if (typeof time === 'string') {
        return time
    }
    return null
}

// timeFormatter for the crosshair label
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
    if (typeof time === 'string') {
        return time
    }
    return ''
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
const { tradeChartTf: selectedTf, tradeChartShowAdjacent: showAdjacent, dailyFilters } = storeToRefs(dbStateStore)

let chart: ReturnType<typeof createChart> | null = null
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null
let tradeLine: ISeriesApi<'Line'> | null = null
let seriesMarkers: ISeriesMarkersPluginApi<Time> | null = null
let priceSegments: ISeriesApi<'Line'>[] = []
let lastBars: PolygonBar[] = []

// Resolve the Polygon ticker for the trade symbol.
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

const shouldRender = computed(() => polygonSymbol.value !== null)

const getChartColors = () => {
    return {
        background: isDark.value
            ? { type: ColorType.Solid, color: '#1e1e1e' }
            : { type: ColorType.VerticalGradient, topColor: '#e5e7eb', bottomColor: '#f3f4f6' },
        textColor: isDark.value ? '#d1d5db' : '#333',
        gridColor: isDark.value ? '#2d2d2d' : '#e1e1e1',
        upColor: isDark.value ? '#22c55e' : '#26a69a',
        downColor: isDark.value ? '#ef4444' : '#ef5350',
        buyColor: isDark.value ? '#4ade80' : '#16a34a',
        sellColor: isDark.value ? '#f87171' : '#dc2626',
        exitColor: isDark.value ? '#facc15' : '#d97706',
        lineColor: isDark.value ? '#60a5fa' : '#2563eb',
    }
}

const updateChartColors = () => {
    if (!chart || !candlestickSeries) return

    const colors = getChartColors()

    chart.applyOptions({
        layout: {
            background: colors.background,
            textColor: colors.textColor,
        },
        grid: {
            vertLines: { color: colors.gridColor },
            horzLines: { color: colors.gridColor },
        },
    })

    candlestickSeries.applyOptions({
        upColor: colors.upColor,
        downColor: colors.downColor,
        wickUpColor: colors.upColor,
        wickDownColor: colors.downColor,
    })

    if (tradeLine) {
        tradeLine.applyOptions({ color: colors.lineColor })
    }

    // Re-create the markers so they pick up the new theme colors
    if (lastBars.length > 0) {
        if (tradeLine && chart) {
            chart.removeSeries(tradeLine)
            tradeLine = null
        }
        addTradeMarkers(lastBars)
    }
}

// Find the bar index that contains the given timestamp (the bar whose period includes the trade time).
// For a 1H bar at 16:00, it covers 16:00-17:00, so a trade at 16:01 belongs to this bar.
// We find the last bar with time <= timestamp; if none, return the first bar.
const findBarIndex = (data: PolygonBar[], timestamp: number): number => {
    let result = -1
    for (let i = 0; i < data.length; i++) {
        if (data[i].time <= timestamp) {
            result = i
        } else {
            break
        }
    }
    if (result !== -1) return result
    return 0
}

// Check if a timestamp falls within the data range (inclusive of first and last bar).
const isInRange = (data: PolygonBar[], timestamp: number): boolean => {
    if (data.length === 0) return false
    return timestamp >= data[0].time && timestamp <= data[data.length - 1].time
}

// Show a window of bars centered on the trade midpoint.
// All fetched bars remain in the series (scrollable), but only this window is visible on load.
// The window size is adaptive: smaller timeframes need more bars to cover a full market session.
const centerOnTrade = (data: PolygonBar[]) => {
    if (!chart || data.length === 0) return

    const entryTs = Math.floor(new Date(props.trade.openDate).getTime() / 1000)
    const exitTs = Math.floor(new Date(props.trade.closeDate).getTime() / 1000)
    const entryIdx = findBarIndex(data, entryTs)
    const exitIdx = findBarIndex(data, exitTs)

    const tradeMid = (entryIdx + exitIdx) / 2

    // Adaptive visible bars per side based on timeframe.
    // 1min: 500 bars (~8h, more than a US session), 5min: 300 (~25h),
    // 15min: 200, 1h: 120, 4h: 100, daily: 100.
    const tfMinutes = Number(selectedTf.value)
    let visibleBars: number
    if (tfMinutes <= 1) visibleBars = 500
    else if (tfMinutes <= 5) visibleBars = 300
    else if (tfMinutes <= 15) visibleBars = 200
    else if (tfMinutes <= 60) visibleBars = 120
    else if (tfMinutes <= 240) visibleBars = 100
    else visibleBars = 100

    // Right side is not clamped so empty space is reserved when few bars exist after exit.
    const from = Math.max(0, tradeMid - visibleBars)
    const to = tradeMid + visibleBars

    chart.timeScale().setVisibleLogicalRange({ from, to })
}

// Number of bars to extend the price segment on each side of the entry/exit candle.
const priceSegmentPadding = 2

// Remove all price-segment series created by addTradeMarkers.
const clearPriceSegments = () => {
    if (!chart) return
    for (const series of priceSegments) {
        chart.removeSeries(series)
    }
    priceSegments = []
}

// Create a short horizontal line segment at the given price, centered on the
// bar at barIdx and extending a few bars on each side.
const addPriceSegment = (
    data: PolygonBar[],
    barIdx: number,
    price: number,
    color: string,
) => {
    if (!chart) return
    const fromIdx = Math.max(0, barIdx - priceSegmentPadding)
    const toIdx = Math.min(data.length - 1, barIdx + priceSegmentPadding)

    const segment = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        pointMarkersVisible: false,
    })

    segment.setData([
        { time: data[fromIdx].time as UTCTimestamp, value: price },
        { time: data[toIdx].time as UTCTimestamp, value: price },
    ])

    priceSegments.push(segment)
}

// Add markers for the main trade (entry/exit) and adjacent trades.
// Entry/exit prices are shown as short horizontal line segments centered on the
// trade candle, with BUY/SELL/EXIT labels as markers above/below the bar.
// Adjacent trades use aboveBar/belowBar circle markers for context.
const addTradeMarkers = (data: PolygonBar[]) => {
    if (!candlestickSeries || data.length === 0) return

    const colors = getChartColors()
    const entryColor = props.trade.type === 'buy' ? colors.buyColor : colors.sellColor

    // Main trade entry/exit timestamps
    const entryTs = Math.floor(new Date(props.trade.openDate).getTime() / 1000)
    const exitTs = Math.floor(new Date(props.trade.closeDate).getTime() / 1000)

    const entryInBounds = isInRange(data, entryTs)
    const exitInBounds = isInRange(data, exitTs)

    const entryIdx = findBarIndex(data, entryTs)
    const exitIdx = findBarIndex(data, exitTs)

    const entryTime = data[entryIdx].time as UTCTimestamp
    const exitTime = data[exitIdx].time as UTCTimestamp

    // Monochrome color for adjacent trades (white in dark mode, black in light mode)
    const monoColor = isDark.value ? '#ffffff' : '#000000'

    // Markers: entry label below bar, exit label above bar.
    // Skip markers that fall outside the fetched data range.
    const markers: Array<{
        time: Time
        position: 'aboveBar' | 'belowBar'
        color: string
        shape: 'arrowUp' | 'arrowDown'
        text: string
    }> = []

    if (entryInBounds) {
        markers.push({
            time: entryTime,
            position: 'belowBar',
            color: entryColor,
            shape: 'arrowUp',
            text: `${props.trade.type === 'buy' ? 'BUY' : 'SELL'} ${props.trade.lot}`,
        })
    }

    if (exitInBounds) {
        markers.push({
            time: exitTime,
            position: 'aboveBar',
            color: colors.exitColor,
            shape: 'arrowDown',
            text: `EXIT ${props.trade.lot}`,
        })
    }

    for (const adj of chartAdjacentTrades.value) {
        const adjEntryTs = Math.floor(new Date(adj.openDate).getTime() / 1000)
        const adjExitTs = Math.floor(new Date(adj.closeDate).getTime() / 1000)

        const adjEntryInBounds = isInRange(data, adjEntryTs)
        const adjExitInBounds = isInRange(data, adjExitTs)

        const adjEntryIdx = findBarIndex(data, adjEntryTs)
        const adjExitIdx = findBarIndex(data, adjExitTs)

        const adjEntryTime = data[adjEntryIdx].time as UTCTimestamp
        const adjExitTime = data[adjExitIdx].time as UTCTimestamp

        if (adjEntryInBounds) {
            markers.push({
                time: adjEntryTime,
                position: 'belowBar',
                color: monoColor,
                shape: 'arrowUp',
                text: `${adj.type === 'buy' ? 'BUY' : 'SELL'} ${adj.lot}`,
            })
        }

        if (adjExitInBounds) {
            markers.push({
                time: adjExitTime,
                position: 'aboveBar',
                color: monoColor,
                shape: 'arrowDown',
                text: `EXIT ${adj.lot}`,
            })
        }
    }

    // Sort markers by time (required by lightweight-charts)
    markers.sort((a, b) => (a.time as number) - (b.time as number))

    // Reuse the existing markers plugin to avoid stacking duplicates on reload
    if (seriesMarkers) {
        seriesMarkers.setMarkers(markers)
    } else {
        seriesMarkers = createSeriesMarkers(candlestickSeries, markers)
    }

    // Horizontal price segments at exact entry/exit prices, centered on the candle.
    // Main trade uses entry/exit colors; adjacent trades use monochrome.
    // Skip segments that fall outside the fetched data range.
    clearPriceSegments()
    if (entryInBounds) addPriceSegment(data, entryIdx, props.trade.openPrice, entryColor)
    if (exitInBounds) addPriceSegment(data, exitIdx, props.trade.closePrice, colors.exitColor)

    for (const adj of chartAdjacentTrades.value) {
        const adjEntryTs = Math.floor(new Date(adj.openDate).getTime() / 1000)
        const adjExitTs = Math.floor(new Date(adj.closeDate).getTime() / 1000)
        const adjEntryInBounds = isInRange(data, adjEntryTs)
        const adjExitInBounds = isInRange(data, adjExitTs)
        const adjEntryIdx = findBarIndex(data, adjEntryTs)
        const adjExitIdx = findBarIndex(data, adjExitTs)
        if (adjEntryInBounds) addPriceSegment(data, adjEntryIdx, adj.openPrice, monoColor)
        if (adjExitInBounds) addPriceSegment(data, adjExitIdx, adj.closePrice, monoColor)
    }

    // Draw a dashed line connecting entry and exit of the main trade
    // Only if both entry and exit are within the data range
    // Remove any previous trade line before creating a new one.
    if (tradeLine && chart) {
        chart.removeSeries(tradeLine)
        tradeLine = null
    }
    if (entryInBounds && exitInBounds && entryTime !== exitTime && chart) {
        tradeLine = chart.addSeries(LineSeries, {
            color: colors.lineColor,
            lineWidth: 1,
            lineStyle: 2,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        })

        tradeLine.setData([
            { time: entryTime, value: props.trade.openPrice },
            { time: exitTime, value: props.trade.closePrice },
        ])
    }
}

const forcedInstrumentType = computed(() => polygonSymbolResult.value?.forcedInstrumentType ?? null)
const { fetchBars, refetchBars } = usePolygonBars(polygonSymbol, props.trade, forcedInstrumentType)

// Chart event handlers (declared at component scope so they survive re-init).
let handleResize: (() => void) | null = null
let handleWheel: ((e: WheelEvent) => void) | null = null
let handleMouseEnter: (() => void) | null = null
let handleMouseLeave: (() => void) | null = null
let lockedScrollEl: HTMLElement | null = null

const findScrollableAncestor = (el: HTMLElement): HTMLElement | null => {
    let node: HTMLElement | null = el.parentElement
    while (node) {
        const style = getComputedStyle(node)
        const overflowY = style.overflowY
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node
        }
        node = node.parentElement
    }
    return null
}

const removeChartListeners = () => {
    if (handleResize) window.removeEventListener('resize', handleResize)
    if (handleWheel && chartContainer.value) chartContainer.value.removeEventListener('wheel', handleWheel)
    if (handleMouseEnter && chartContainer.value) chartContainer.value.removeEventListener('mouseenter', handleMouseEnter)
    if (handleMouseLeave && chartContainer.value) chartContainer.value.removeEventListener('mouseleave', handleMouseLeave)
    if (lockedScrollEl) {
        lockedScrollEl.style.overflow = lockedScrollEl.dataset.prevOverflow || ''
        delete lockedScrollEl.dataset.prevOverflow
        lockedScrollEl = null
    }
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
        layout: {
            background: colors.background,
            textColor: colors.textColor,
        },
        localization: {
            timeFormatter: crosshairTimeFormatter,
        },
        width: chartContainer.value.clientWidth,
        height: 500,
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter,
        },
        grid: {
            vertLines: { color: colors.gridColor },
            horzLines: { color: colors.gridColor },
        },
        crosshair: {
            mode: 0,
        },
    })

    candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: colors.upColor,
        downColor: colors.downColor,
        borderVisible: false,
        wickUpColor: colors.upColor,
        wickDownColor: colors.downColor,
    })

    await loadChartData()

    // Guard: if the component was destroyed during async load, bail out.
    if (!chartContainer.value || !chart) return

    // Prevent the chart canvas from grabbing focus and intercepting keyboard
    // scrolling (arrows, Home/End, PageUp/Down) of the parent modal.
    const canvas = chartContainer.value?.querySelector('canvas')
    if (canvas) {
        canvas.setAttribute('tabindex', '-1')
    }

    handleResize = () => {
        if (chart && chartContainer.value) {
            chart.applyOptions({ width: chartContainer.value.clientWidth })
        }
    }

    // Prevent wheel events over the chart from scrolling the parent modal.
    handleWheel = (e: WheelEvent) => {
        e.preventDefault()
    }

    // Lock the scrollable ancestor's overflow while hovering the chart.
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
        candlestickSeries.setData(data.map(bar => ({ ...bar, time: bar.time as UTCTimestamp })))
        lastBars = data
        addTradeMarkers(data)
        centerOnTrade(data)
    } catch (err) {
        const msg = (err as Error).message
        if (msg === 'RANGE_TOO_LARGE') {
            error.value = t('components.trade.chart.range_too_large')
        } else if (msg === 'MISSING_POLYGON_API_KEY') {
            error.value = t('components.trade.chart.missing_api_key')
        } else {
            error.value = msg || t('components.trade.chart.error')
        }
    } finally {
        loading.value = false
    }
}

const onTfChange = async () => {
    // Reset the chart series before reloading
    if (candlestickSeries) {
        candlestickSeries.setData([])
    }
    clearPriceSegments()
    if (tradeLine && chart) {
        chart.removeSeries(tradeLine)
        tradeLine = null
    }
    await loadChartData()
}

const onReload = async () => {
    // If the chart was never created or was destroyed (e.g. error state),
    // clear the error and wait for the container to reappear, then re-init.
    if (!chart || !candlestickSeries) {
        error.value = ''
        await nextTick()
        await initChart()
        if (showAdjacent.value) {
            loadAdjacentTrades().then(() => {
                if (lastBars.length > 0) {
                    addTradeMarkers(lastBars)
                }
            })
        }
        return
    }
    if (candlestickSeries) {
        candlestickSeries.setData([])
    }
    clearPriceSegments()
    if (tradeLine && chart) {
        chart.removeSeries(tradeLine)
        tradeLine = null
    }
    loading.value = true
    error.value = ''
    try {
        const data = await refetchBars(selectedTf.value)
        if (data.length === 0) {
            error.value = t('components.trade.chart.no_data')
            return
        }
        candlestickSeries.setData(data.map(bar => ({ ...bar, time: bar.time as UTCTimestamp })))
        lastBars = data
        addTradeMarkers(data)
        centerOnTrade(data)
    } catch (err) {
        const msg = (err as Error).message
        if (msg === 'RANGE_TOO_LARGE') {
            error.value = t('components.trade.chart.range_too_large')
        } else if (msg === 'MISSING_POLYGON_API_KEY') {
            error.value = t('components.trade.chart.missing_api_key')
        } else {
            error.value = msg || t('components.trade.chart.error')
        }
    } finally {
        loading.value = false
    }
}

// Destroy the current chart and reset all state so initChart can run fresh.
const destroyChart = () => {
    removeChartListeners()
    clearPriceSegments()
    if (tradeLine && chart) {
        chart.removeSeries(tradeLine)
        tradeLine = null
    }
    if (chart) {
        chart.remove()
        chart = null
    }
    candlestickSeries = null
    seriesMarkers = null
    lastBars = []
    error.value = ''
    loading.value = false
}

// Single entry point for chart initialization (replaces onMounted + watch).
// immediate: true handles the initial mount; subsequent trade.id changes re-init.
let initInProgress = false
watch(() => props.trade.id, async () => {
    if (initInProgress) return
    initInProgress = true
    destroyChart()
    await nextTick()
    await initChart()
    if (showAdjacent.value) {
        loadAdjacentTrades().then(() => {
            if (lastBars.length > 0) {
                addTradeMarkers(lastBars)
            }
        })
    }
    initInProgress = false
}, { immediate: true })

onUnmounted(() => {
    removeChartListeners()
    if (chart) {
        chart.remove()
        chart = null
    }
})

const onAdjacentToggle = (val: boolean | 'indeterminate') => {
    const enabled = val === true
    showAdjacent.value = enabled
    if (enabled) {
        loadAdjacentTrades().then(() => {
            if (lastBars.length > 0) {
                addTradeMarkers(lastBars)
            }
        })
    } else {
        chartAdjacentTrades.value = []
        if (lastBars.length > 0) {
            addTradeMarkers(lastBars)
        }
    }
}

watch(
    () => colorMode.value,
    () => {
        updateChartColors()
    }
)
</script>
