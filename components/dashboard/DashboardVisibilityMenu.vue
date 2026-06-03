<template>
	<UPopover>
		<UButton icon="i-lucide-eye" size="sm" variant="ghost" color="neutral">
			{{ $t('components.dashboard.visibility.title') }}
		</UButton>
		<template #content>
			<div class="p-2 space-y-4">
				<div>
					<div class="text-xs font-semibold text-secondary mb-1">{{ $t('components.dashboard.visibility.charts') }}</div>
					<div class="space-y-1">
						<label v-for="chart in chartConfig" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox
								:model-value="localChartVisibility[chart.id]"
								@update:model-value="toggleChart(chart.id)"
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
								:model-value="localSectionVisibility[section.id]"
								@update:model-value="toggleSection(section.id)"
							/>
							<span>{{ t(section.label) }}</span>
						</label>
					</div>
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
]

const localChartVisibility = ref<Record<string, boolean>>({ ...props.chartVisibility })
const localSectionVisibility = ref<Record<string, boolean>>({ ...props.sectionVisibility })

watch(() => props.chartVisibility, (newVal) => {
	localChartVisibility.value = { ...newVal }
}, { deep: true })

watch(() => props.sectionVisibility, (newVal) => {
	localSectionVisibility.value = { ...newVal }
}, { deep: true })

const toggleChart = (chartId: string) => {
	localChartVisibility.value[chartId] = !localChartVisibility.value[chartId]
	setTimeout(() => {
		emit('update:chartVisibility', { ...localChartVisibility.value })
	}, 50)
}

const toggleSection = (sectionId: string) => {
	localSectionVisibility.value[sectionId] = !localSectionVisibility.value[sectionId]
	setTimeout(() => {
		emit('update:sectionVisibility', { ...localSectionVisibility.value })
	}, 50)
}
</script>
