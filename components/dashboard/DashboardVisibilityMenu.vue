<template>
	<UPopover v-model:open="isOpen" :content="{ align: 'start', sideOffset: 8 }" @update:open="onPopoverChange">
		<UButton icon="i-lucide-eye" size="sm" variant="ghost" color="neutral">
			{{ $t('components.dashboard.visibility.title') }}
		</UButton>
		<template #content>
			<div class="p-3 space-y-3 w-[min(95vw,860px)]">
				<!-- 4 colonnes responsive : Charts | Temporel | Breakdowns | Sections -->
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Colonne 1 : Charts principaux -->
					<div>
						<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.charts') }}</div>
						<div class="space-y-2">
							<label v-for="chart in chartOptions" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
								<UCheckbox v-model="localChartVisibility[chart.id]" />
								<span class="text-sm">{{ chart.label }}</span>
							</label>
						</div>
					</div>

					<!-- Colonne 2 : Analyse temporelle -->
					<div>
						<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.time_charts') }}</div>
						<div class="space-y-2">
							<label v-for="chart in timeChartOptions" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
								<UCheckbox v-model="localChartVisibility[chart.id]" />
								<span class="text-sm">{{ chart.label }}</span>
							</label>
						</div>
					</div>

					<!-- Colonne 3 : Breakdowns (création) -->
					<div>
						<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.breakdown_charts') }}</div>
						<!-- Types de breakdown avec bouton "créer" -->
						<div class="space-y-1">
							<div v-for="bt in breakdownTypes" :key="bt.baseKey" class="flex items-center gap-1">
								<span class="text-sm flex-1">{{ $t(bt.labelKey) }}</span>
								<UButton
									icon="i-lucide-plus"
									size="xs"
									variant="ghost"
									color="neutral"
									@click="onCreateBreakdown(bt.baseKey)"
								/>
							</div>
						</div>
						<p class="text-xs text-muted mt-2">{{ $t('components.dashboard.visibility.breakdown_hint') }}</p>
					</div>

					<!-- Colonne 4 : Sections -->
					<div>
						<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.sections') }}</div>
						<div class="space-y-2">
							<label v-for="section in sectionOptions" :key="section.id" class="flex items-center gap-2 cursor-pointer">
								<UCheckbox v-model="localSectionVisibility[section.id]" />
								<span class="text-sm">{{ section.label }}</span>
							</label>
						</div>
					</div>
				</div>

				<!-- Sync + actions -->
				<div class="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
					<label class="flex items-center gap-2 cursor-pointer text-xs">
						<UCheckbox v-model="syncAllBreakpoints" />
						<span>{{ $t('components.dashboard.visibility.sync_all_breakpoints') }}</span>
					</label>
					<div class="flex gap-2">
						<UButton size="xs" color="primary" :loading="isApplying" @click="applyChanges">
							{{ $t('common.actions.apply') }}
						</UButton>
						<UButton size="xs" variant="ghost" color="neutral" @click="clearAll">
							{{ $t('common.actions.clear') }}
						</UButton>
						<UButton size="xs" variant="ghost" color="neutral" @click="cancelChanges">
							{{ $t('common.cancel') }}
						</UButton>
					</div>
				</div>
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
import type { ChartKey, SectionKey, BreakdownBaseKey } from '~/type'
import { breakdownTypes, useBreakdownInstances } from '~/composables/metrics/useBreakdownConfig'

const props = defineProps<{
	chartVisibility: Record<string, boolean>
	sectionVisibility: Record<SectionKey, boolean>
}>()

const emit = defineEmits<{
	'update:chartVisibility': [value: Record<string, boolean>]
	'update:sectionVisibility': [value: Record<SectionKey, boolean>]
	'syncToAllBreakpoints': [chartVisibility: Record<string, boolean>, sectionVisibility: Record<SectionKey, boolean>]
}>()

const { t } = useI18n()
const { createInstance } = useBreakdownInstances()

type ChartOption = { id: string; label: string }
type SectionOption = { id: SectionKey; label: string }

const chartOptions = computed<ChartOption[]>(() => [
	{ id: 'pnlBar', label: t('components.dashboard.charts.pnl_bar') },
	{ id: 'cumulatedPnl', label: t('components.dashboard.charts.cumulated_pnl') },
	{ id: 'appt', label: t('components.dashboard.charts.appt') },
	{ id: 'winrate', label: t('components.dashboard.charts.winrate') },
])

const timeChartOptions = computed<ChartOption[]>(() => [
	{ id: 'hourlyHeatmap', label: t('components.dashboard.charts.hourly_heatmap') },
	{ id: 'hourlyWinrate', label: t('components.dashboard.charts.hourly_winrate') },
	{ id: 'dayOfWeekPnl', label: t('components.dashboard.charts.day_of_week_pnl') },
])

const sectionOptions = computed<SectionOption[]>(() => [
	{ id: 'allTrades', label: t('components.dashboard.sections.all_trades') },
	{ id: 'profitTrades', label: t('components.dashboard.sections.profit_trades') },
	{ id: 'losingTrades', label: t('components.dashboard.sections.losing_trades') },
	{ id: 'winLossComparison', label: t('components.dashboard.sections.win_loss_comparison') },
	{ id: 'riskRatios', label: t('components.dashboard.sections.risk_ratios') },
	{ id: 'dayStatistics', label: t('components.dashboard.sections.day_statistics') },
])

const onCreateBreakdown = (baseKey: BreakdownBaseKey) => {
	const newKey = createInstance(baseKey)
	// Ajoute la nouvelle clé à la visibilité locale
	localChartVisibility.value[newKey] = true
}

const localChartVisibility = ref({ ...props.chartVisibility })
const localSectionVisibility = ref({ ...props.sectionVisibility })

watch(() => props.chartVisibility, (val) => {
	localChartVisibility.value = { ...val }
}, { deep: true })

watch(() => props.sectionVisibility, (val) => {
	localSectionVisibility.value = { ...val }
}, { deep: true })

const isOpen = ref(false)
const syncAllBreakpoints = ref(false)
const isApplying = ref(false)

const onPopoverChange = (open: boolean) => {
	if (!open) {
		localChartVisibility.value = { ...props.chartVisibility }
		localSectionVisibility.value = { ...props.sectionVisibility }
		syncAllBreakpoints.value = false
	}
}

const applyChanges = async () => {
	isApplying.value = true
	await new Promise(resolve => setTimeout(resolve, 150))
	if (syncAllBreakpoints.value) {
		emit('syncToAllBreakpoints', { ...localChartVisibility.value }, { ...localSectionVisibility.value })
	} else {
		emit('update:chartVisibility', { ...localChartVisibility.value })
		emit('update:sectionVisibility', { ...localSectionVisibility.value })
	}
	syncAllBreakpoints.value = false
	isApplying.value = false
	isOpen.value = false
}

const clearAll = () => {
	const clearedCharts = Object.keys(localChartVisibility.value).reduce((acc, k) => {
		acc[k as ChartKey] = false
		return acc
	}, {} as Record<ChartKey, boolean>)
	const clearedSections = Object.keys(localSectionVisibility.value).reduce((acc, k) => {
		acc[k as SectionKey] = false
		return acc
	}, {} as Record<SectionKey, boolean>)
	localChartVisibility.value = clearedCharts
	localSectionVisibility.value = clearedSections
}

const cancelChanges = () => {
	localChartVisibility.value = { ...props.chartVisibility }
	localSectionVisibility.value = { ...props.sectionVisibility }
	isOpen.value = false
}
</script>
