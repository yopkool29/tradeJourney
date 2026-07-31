<template>
	<DashboardChartsBaseWidgetCard
		:title="title"
		:enlarged-title="title"
		:hide-enlarge="true"
		:use-default-slot="true"
		:title-class="titleClass"
	>
		<div :class="columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm' : 'space-y-3 text-sm'" class="overflow-y-auto max-h-full">
			<div
				v-for="(row, i) in visibleRows"
				:key="i"
				class="flex justify-between"
				:class="{ 'border-t pt-3 mt-3': row.borderTop, 'text-xs': row.small, 'col-span-2': columns === 2 && row.borderTop }"
			>
				<span class="text-secondary">{{ $t(row.label) }}</span>
				<span class="font-semibold" :class="row.valueClass">{{ formatRowValue(row) }}</span>
			</div>
		</div>
	</DashboardChartsBaseWidgetCard>
</template>

<script setup lang="ts">
import { useMetricsBaseSectionPattern } from '~/composables/dashboard/useBaseSectionPattern'

export interface StatsRow {
	label: string
	value?: number | string | Date | null
	displayValue?: string
	format?: 'currency' | 'duration' | 'date' | 'dateOnly' | 'percent' | 'number' | 'rMultiple' | 'decimal1'
	valueClass?: string
	condition?: boolean
	small?: boolean
	borderTop?: boolean
}

interface Props {
	title: string
	titleClass?: string
	rows: StatsRow[]
	columns?: 1 | 2
}

const props = defineProps<Props>()

const { formatCurrency, formatDurationMinutes, formatDateOrDash } = useMetricsBaseSectionPattern()

const visibleRows = computed(() => props.rows.filter(r => r.condition !== false))

const formatRowValue = (row: StatsRow): string => {
	if (row.displayValue !== undefined) return row.displayValue
	if (row.value === undefined || row.value === null) return '—'
	switch (row.format) {
		case 'currency':
			return formatCurrency(typeof row.value === 'number' ? row.value : Number(row.value))
		case 'duration':
			return formatDurationMinutes(typeof row.value === 'number' ? row.value : Number(row.value))
		case 'date': {
			if (row.value instanceof Date) return formatDateOrDash(row.value)
			if (typeof row.value === 'string') return formatDateOrDash(new Date(row.value))
			return formatDateOrDash(new Date(row.value as number))
		}
		case 'dateOnly': {
			if (row.value instanceof Date) return formatDateOrDash(row.value, false)
			if (typeof row.value === 'string') return formatDateOrDash(new Date(row.value), false)
			return formatDateOrDash(new Date(row.value as number), false)
		}
		case 'percent': {
			const percentValue = typeof row.value === 'number' ? row.value : Number(row.value)
			return `${percentValue.toFixed(2)}%`
		}
		case 'number':
			return String(row.value)
		case 'decimal1': {
			const decVal = typeof row.value === 'number' ? row.value : Number(row.value)
			return decVal.toFixed(1)
		}
		case 'rMultiple': {
			if (row.value === null || row.value === undefined) return '—'
			const rVal = typeof row.value === 'number' ? row.value : Number(row.value)
			if (isNaN(rVal)) return '—'
			return `${rVal >= 0 ? '+' : ''}${rVal.toFixed(2)}R`
		}
		default:
			return String(row.value)
	}
}
</script>
