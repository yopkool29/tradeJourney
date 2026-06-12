<template>
	<UPopover v-model:open="isOpen" @update:open="onPopoverChange">
		<UButton icon="i-lucide-eye" size="sm" variant="ghost" color="neutral">
			{{ $t('components.dashboard.visibility.title') }}
		</UButton>
		<template #content>
			<div class="p-2 space-y-4 min-w-[180px]">
				<div>
					<div class="text-xs font-semibold text-secondary mb-1">{{ $t('components.dashboard.visibility.charts') }}</div>
					<div class="space-y-1">
						<label v-for="chart in chartConfig" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox
								v-model="localChartVisibility[chart.id]"
							/>
							<span>{{ t(chart.label) }}</span>
						</label>
					</div>
				</div>
				<div>
					<div class="text-xs font-semibold text-secondary mb-1">{{ $t('components.dashboard.visibility.ticker_charts') }}</div>
					<div class="space-y-1">
						<label v-for="chart in tickerChartConfig" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox
								v-model="localChartVisibility[chart.id]"
							/>
							<span>{{ t(chart.label) }}</span>
						</label>
					</div>
				</div>
				<div>
					<div class="text-xs font-semibold text-secondary mb-1">{{ $t('components.dashboard.visibility.sections') }}</div>
					<div class="space-y-1">
						<label v-for="section in sectionConfig" :key="section.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox
								v-model="localSectionVisibility[section.id]"
							/>
							<span>{{ t(section.label) }}</span>
						</label>
					</div>
				</div>
				<div class="filter-actions">
					<UButton size="xs" color="primary" @click="applyChanges">
						{{ $t('common.actions.apply') }}
					</UButton>
					<UButton size="xs" variant="ghost" color="neutral" @click="cancelChanges">
						{{ $t('common.cancel') }}
					</UButton>
				</div>
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
import type { ChartKey, SectionKey } from '~/type'

const props = defineProps<{
	chartVisibility: Record<string, boolean>
	sectionVisibility: Record<string, boolean>
}>()

// Local copies for immediate UI feedback
const localChartVisibility = ref({ ...props.chartVisibility })
const localSectionVisibility = ref({ ...props.sectionVisibility })

// Sync with props when they change externally
watch(() => props.chartVisibility, (val) => {
	localChartVisibility.value = { ...val }
}, { deep: true })

watch(() => props.sectionVisibility, (val) => {
	localSectionVisibility.value = { ...val }
}, { deep: true })

const emit = defineEmits<{
	'update:chartVisibility': [value: Record<string, boolean>]
	'update:sectionVisibility': [value: Record<string, boolean>]
}>()

const { t } = useI18n()

const chartConfig = [
	{ id: 'pnlBar', label: 'components.dashboard.charts.pnl_bar' },
	{ id: 'cumulatedPnl', label: 'components.dashboard.charts.cumulated_pnl' },
	{ id: 'appt', label: 'components.dashboard.charts.appt' },
	{ id: 'winrate', label: 'components.dashboard.charts.winrate' },
]

const sectionConfig = [
	{ id: 'allTrades', label: 'components.dashboard.sections.all_trades' },
	{ id: 'profitTrades', label: 'components.dashboard.sections.profit_trades' },
	{ id: 'losingTrades', label: 'components.dashboard.sections.losing_trades' },
	{ id: 'winLossComparison', label: 'components.dashboard.sections.win_loss_comparison' },
	{ id: 'tickerTable', label: 'components.dashboard.sections.ticker_table' },
]

const tickerChartConfig = [
	{ id: 'tickerPnl', label: 'components.dashboard.charts.ticker_pnl' },
	{ id: 'tickerWinrate', label: 'components.dashboard.charts.ticker_winrate' },
	{ id: 'hourlyHeatmap', label: 'components.dashboard.charts.hourly_heatmap' },
	{ id: 'hourlyWinrate', label: 'components.dashboard.charts.hourly_winrate' },
]

const isOpen = ref(false)

const onPopoverChange = (open: boolean) => {
	if (!open) {
		// Reset to original values when closing without applying
		localChartVisibility.value = { ...props.chartVisibility }
		localSectionVisibility.value = { ...props.sectionVisibility }
	}
}

const applyChanges = () => {
	emit('update:chartVisibility', { ...localChartVisibility.value })
	emit('update:sectionVisibility', { ...localSectionVisibility.value })
	isOpen.value = false
}

const cancelChanges = () => {
	localChartVisibility.value = { ...props.chartVisibility }
	localSectionVisibility.value = { ...props.sectionVisibility }
	isOpen.value = false
}
</script>
