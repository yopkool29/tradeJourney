<template>
	<CommonModalDefault v-model:open="isOpen" :title="$t('components.dashboard.visibility.title')" :ui="{ content: 'max-w-2xl' }" @closed="onModalClosed">
		<template #trigger>
			<UButton icon="i-lucide-eye" size="sm" color="primary">
				{{ $t('components.dashboard.visibility.title') }}
			</UButton>
		</template>

		<template #content>
			<div class="space-y-3">
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
					<UAccordion :items="chartAccordionItems" :ui="{ trigger: 'text-sm' }">
						<template v-for="group in chartTemplateGroups" :key="group.id" #[group.id]>
							<div class="space-y-1">
								<div v-for="tmpl in group.templates" :key="tmpl.id" class="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-700" @click="onCreateFromTemplate(tmpl.id)">
									<span class="text-sm">{{ $t(tmpl.labelKey) }}</span>
									<UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-primary shrink-0" />
								</div>
							</div>
						</template>
					</UAccordion>
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
			</div>
		</template>

		<template #footer>
			<div class="flex items-center justify-between gap-4 w-full">
				<label class="flex items-center gap-2 cursor-pointer text-sm">
					<UCheckbox v-model="syncAllBreakpoints" />
					<span>{{ $t('components.dashboard.visibility.sync_all_breakpoints') }}</span>
				</label>
				<div class="action-buttons-end">
					<UButton color="primary" :loading="isApplying" @click="applyChanges">
						{{ $t('common.actions.apply') }}
					</UButton>
					<UButton variant="soft" @click="clearAll">
						{{ $t('common.actions.clear') }}
					</UButton>
					<UButton variant="soft" @click="cancelChanges">
						{{ $t('common.actions.cancel') }}
					</UButton>
				</div>
			</div>
		</template>
	</CommonModalDefault>
</template>

<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
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

// Items pour l'accordéon "Ajouter un chart"
type ChartTemplateGroup = { id: string; labelKey: string; templates: { id: string; labelKey: string }[] }
const chartTemplateGroups = computed<ChartTemplateGroup[]>(() => [
	{ id: 'bars', labelKey: 'components.dashboard.visibility.templates_breakdown_bars', templates: breakdownTemplatesBySubcategory.bars },
	{ id: 'scatterHeatmap', labelKey: 'components.dashboard.visibility.templates_breakdown_scatter_heatmap', templates: breakdownTemplatesBySubcategory.scatterHeatmap },
	{ id: 'distribution', labelKey: 'components.dashboard.visibility.templates_breakdown_distribution', templates: breakdownTemplatesBySubcategory.distribution },
	{ id: 'timeSeries', labelKey: 'components.dashboard.visibility.templates_time_series', templates: breakdownTemplatesBySubcategory.timeSeries },
	{ id: 'advancedBreakdown', labelKey: 'components.dashboard.visibility.templates_advanced_breakdown', templates: advancedTemplatesBySubcategory.breakdown },
	{ id: 'advancedTimeSeries', labelKey: 'components.dashboard.visibility.templates_advanced_timeseries', templates: advancedTemplatesBySubcategory.timeSeries },
])

const chartAccordionItems = computed<AccordionItem[]>(() =>
	chartTemplateGroups.value
		.filter(g => g.templates.length > 0)
		.map(g => ({ label: t(g.labelKey), slot: g.id })),
)

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

const onModalClosed = () => {
	localChartVisibility.value = { ...props.chartVisibility }
	localSectionVisibility.value = { ...props.sectionVisibility }
	syncAllBreakpoints.value = false
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
