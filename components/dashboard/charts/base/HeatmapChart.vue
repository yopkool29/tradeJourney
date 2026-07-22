<template>
    <DashboardChartsBaseWidgetCard
        :title="title"
        :enlarged-title="enlargedTitle"
        :chart-option="chartOption"
        :loading="loading"
        hide-chart-while-loading
    />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { EChartsOption } from 'echarts'
import { getEchartsBaseOption, getEchartsAxisColors, getEchartsTooltipColors } from '~/utils/chart-utils'
import { buildHeatmapSeries, buildVisualMap } from '~/utils/echarts-builders'
import type { EChartsFormatterParams, EChartsGridOption } from '~/utils/echarts-builders'

const props = defineProps({
    title: { type: String, required: true },
    enlargedTitle: { type: String, required: true },
    data: { type: Array as PropType<[number | string, number | string, number][]>, required: true },
    xLabels: { type: Array as PropType<string[]>, required: true },
    yLabels: { type: Array as PropType<string[]>, required: true },
    visualMap: {
        type: Object as PropType<{ min: number; max: number }>,
        required: true,
    },
    tooltipFormatter: { type: Function as PropType<(params: EChartsFormatterParams<unknown>, labels: string[]) => string>, default: undefined },
    loading: { type: Boolean, default: false },
    grid: {
        type: Object as PropType<EChartsGridOption>,
        default: () => ({ left: 60, right: 16, top: 24, bottom: 40 }),
    },
})

const isDark = useIsDark()

const chartOption = computed((): EChartsOption => {
    const { axisColor, textColor } = getEchartsAxisColors(isDark.value)
    const { backgroundColor, borderColor, textColor: tooltipTextColor } = getEchartsTooltipColors()

    return {
        ...getEchartsBaseOption(),
        grid: props.grid,
        tooltip: {
            trigger: 'item' as const,
            backgroundColor,
            borderColor,
            textStyle: { color: tooltipTextColor, fontSize: 13 },
            appendTo: 'parent',
            className: 'echarts-custom-tooltip',
            ...(props.tooltipFormatter && { formatter: (params: unknown) => props.tooltipFormatter!(params as EChartsFormatterParams<unknown>, props.xLabels) }),
        } as EChartsOption['tooltip'],
        xAxis: {
            type: 'category' as const,
            data: props.xLabels,
            splitArea: { show: true },
            axisLine: { lineStyle: { color: axisColor } },
            axisLabel: { color: textColor, fontSize: 10 },
            axisPointer: { show: false },
        },
        yAxis: {
            type: 'category' as const,
            data: props.yLabels,
            inverse: true,
            splitArea: { show: true },
            axisLine: { lineStyle: { color: axisColor } },
            axisLabel: { color: textColor, fontSize: 13 },
        },
        visualMap: buildVisualMap(props.visualMap, isDark.value),
        series: [
            buildHeatmapSeries(
                {
                    name: 'Heatmap',
                    data: props.data,
                },
                isDark.value
            ),
        ],
    }
})
</script>
