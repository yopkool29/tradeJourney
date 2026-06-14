<template>
	<UCard class="h-full">
		<template #header>
			<h3 class="section-title-semibold" :class="titleClass">
				{{ title }}
			</h3>
		</template>
		<div class="space-y-3 text-sm overflow-y-auto max-h-full">
			<div
				v-for="(row, i) in visibleRows"
				:key="i"
				class="flex justify-between"
				:class="{ 'border-t pt-3 mt-3': row.borderTop, 'text-xs': row.small }"
			>
				<span class="text-secondary">{{ $t(row.label) }}</span>
				<span class="font-semibold" :class="row.valueClass">{{ formatRowValue(row) }}</span>
			</div>
		</div>
	</UCard>
</template>

<script setup lang="ts">
import { useMetricsBaseSectionPattern } from '~/composables/metrics/useBaseSectionPattern'

export interface StatsRow {
	label: string
	value?: number | string
	displayValue?: string
	format?: 'currency' | 'duration' | 'date' | 'percent' | 'number'
	valueClass?: string
	condition?: boolean
	small?: boolean
	borderTop?: boolean
}

interface Props {
	title: string
	titleClass?: string
	rows: StatsRow[]
}

const props = defineProps<Props>()

const { formatCurrency, formatDurationMinutes, formatDateWithFallback } = useMetricsBaseSectionPattern()

const visibleRows = computed(() => props.rows.filter(r => r.condition !== false))

const formatRowValue = (row: StatsRow): string => {
	if (row.displayValue !== undefined) return row.displayValue
	if (row.value === undefined || row.value === null) return '—'
	switch (row.format) {
		case 'currency':
			return formatCurrency(typeof row.value === 'number' ? row.value : Number(row.value))
		case 'duration':
			return formatDurationMinutes(typeof row.value === 'number' ? row.value : Number(row.value))
		case 'date':
			return formatDateWithFallback(typeof row.value === 'string' ? new Date(row.value) : new Date(row.value))
		case 'percent': {
			const percentValue = typeof row.value === 'number' ? row.value : Number(row.value)
			return `${percentValue.toFixed(2)}%`
		}
		case 'number':
			return String(row.value)
		default:
			return String(row.value)
	}
}
</script>
