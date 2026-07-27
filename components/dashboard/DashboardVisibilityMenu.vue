<template>
	<UPopover v-model:open="isOpen" :content="{ align: 'start', sideOffset: 8 }" :ui="{ content: 'max-h-[80vh] overflow-y-auto' }" @update:open="onPopoverChange">
		<UButton icon="i-lucide-eye" size="sm" color="primary">
			{{ $t('components.dashboard.visibility.title') }}
		</UButton>
		<template #content>
			<div class="p-3 space-y-3 w-[min(95vw,860px)]">
				<!-- Sections statistiques -->
				<div class="border-t border-default pt-2">
					<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.sections') }}</div>
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
						<label v-for="section in sectionOptions" :key="section.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox v-model="localSectionVisibility[section.id]" />
							<span class="text-sm">{{ section.label }}</span>
						</label>
					</div>
				</div>

				<!-- Templates : raccourcis pour créer un chart pré-configuré -->
				<div class="border-t border-default pt-2">
					<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.add_chart') }}</div>
					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
						<!-- Répartition : Barres -->
						<div>
							<div class="text-xs text-muted mb-1">{{ $t('components.dashboard.visibility.templates_breakdown_bars') }}</div>
							<div class="space-y-1">
								<div v-for="tmpl in breakdownTemplatesBySubcategory.bars" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
									<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
									<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
								</div>
							</div>
						</div>
						<!-- Répartition : Nuage & Heatmap -->
						<div>
							<div class="text-xs text-muted mb-1">{{ $t('components.dashboard.visibility.templates_breakdown_scatter_heatmap') }}</div>
							<div class="space-y-1">
								<div v-for="tmpl in breakdownTemplatesBySubcategory.scatterHeatmap" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
									<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
									<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
								</div>
							</div>
						</div>
						<!-- Distribution & Profils -->
						<div>
							<div class="text-xs text-muted mb-1">{{ $t('components.dashboard.visibility.templates_breakdown_distribution') }}</div>
							<div class="space-y-1">
								<div v-for="tmpl in breakdownTemplatesBySubcategory.distribution" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
									<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
									<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
								</div>
							</div>
						</div>
						<!-- Séries temporelles (presets) -->
						<div>
							<div class="text-xs text-muted mb-1">{{ $t('components.dashboard.visibility.templates_time_series') }}</div>
							<div class="space-y-1">
								<div v-for="tmpl in breakdownTemplatesBySubcategory.timeSeries" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
									<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
									<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
								</div>
							</div>
						</div>
						<!-- Catégorie : Avancé -->
						<div>
							<div class="text-xs text-muted mb-1">{{ $t('components.dashboard.visibility.templates_advanced') }}</div>
							<div class="space-y-2">
								<!-- Avancé : Breakdown -->
								<div>
									<div class="text-[10px] text-muted/70 mb-0.5">{{ $t('components.dashboard.visibility.templates_advanced_breakdown') }}</div>
									<div class="space-y-1">
										<div v-for="tmpl in advancedTemplatesBySubcategory.breakdown" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
											<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
											<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
										</div>
									</div>
								</div>
								<!-- Avancé : Séries temporelles -->
								<div>
									<div class="text-[10px] text-muted/70 mb-0.5">{{ $t('components.dashboard.visibility.templates_advanced_timeseries') }}</div>
									<div class="space-y-1">
										<div v-for="tmpl in advancedTemplatesBySubcategory.timeSeries" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
											<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
											<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Charts fixes restants (pnlBar, cumulatedPnl, etc.) -->
				<div v-if="fixedChartOptions.length > 0" class="border-t border-default pt-2">
					<div class="text-xs font-semibold text-secondary mb-2">{{ $t('components.dashboard.visibility.charts') }}</div>
					<div class="space-y-1">
						<label v-for="chart in fixedChartOptions" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
							<UCheckbox v-model="localChartVisibility[chart.id]" />
							<span class="text-sm">{{ chart.label }}</span>
						</label>
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
import type { ChartKey, SectionKey } from '~/type'
import { breakdownTemplatesBySubcategory, advancedTemplatesBySubcategory, useBreakdownInstances } from '~/composables/metrics/useBreakdownConfig'

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
const { createFromTemplate } = useBreakdownInstances()
type ChartOption = { id: string; label: string }
type SectionOption = { id: SectionKey; label: string }

// Plus aucun chart fixe — tous migrés vers les templates
const fixedChartOptions = computed<ChartOption[]>(() => [])

const sectionOptions = computed<SectionOption[]>(() => [
	{ id: 'allTrades', label: t('components.dashboard.sections.all_trades') },
	{ id: 'profitTrades', label: t('components.dashboard.sections.profit_trades') },
	{ id: 'losingTrades', label: t('components.dashboard.sections.losing_trades') },
	{ id: 'winLossComparison', label: t('components.dashboard.sections.win_loss_comparison') },
	{ id: 'riskRatios', label: t('components.dashboard.sections.risk_ratios') },
	{ id: 'dayStatistics', label: t('components.dashboard.sections.day_statistics') },
])

const onCreateFromTemplate = (templateId: string) => {
	const newKey = createFromTemplate(templateId)
	if (newKey) {
		localChartVisibility.value[newKey] = true
	}
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
