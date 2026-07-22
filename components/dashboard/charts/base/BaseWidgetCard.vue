<template>
	<div class="relative group">
		<UCard class="h-full flex flex-col" :class="{ 'bg-transparent border-0 shadow-none': transparent }" :ui="{ header: 'p-0 flex-shrink-0', body: 'flex-1 flex flex-col min-h-0 p-2' }">
			<template #header>
				<div class="flex items-center gap-2 w-full px-2 py-1">
					<span class="font-semibold" :class="titleClass">{{ title }}</span>
					<span v-if="subtitle" class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">{{ subtitle }}</span>
					<div class="ml-auto flex items-center gap-1">
						<!-- Slot pour actions personnalisées dans le header (ex: crosshair) -->
						<slot name="header-actions" />
						<UPopover v-if="$slots.settings" v-model:open="isSettingsOpen">
							<button
								class="px-2 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
								:title="'Settings'"
							>
								<UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
							</button>
							<template #content>
								<div class="p-3 min-w-[180px]">
									<slot name="settings" />
								</div>
							</template>
						</UPopover>
						<button
							v-if="!hideEnlarge"
							class="px-2 py-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
							:title="enlargedTitle"
							@click="isModalOpen = true"
						>
							<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
						</button>
						<!-- Bouton close géré par le GridLayout (bouton X overlay) -->
					</div>
					<CommonModalChart
						v-if="!hideEnlarge"
						v-model="isModalOpen"
						:title="enlargedTitle"
						:modal-max-width="modalMaxWidth"
						:modal-height-class="modalHeightClass"
					>
						<template #content>
							<slot name="enlarged">
								<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
							</slot>
						</template>
					</CommonModalChart>
				</div>
				<!-- Slot pour contenu sous le header (ex: dropdowns dimension/métrique) -->
				<div v-if="$slots['header-extra']" class="flex items-center gap-2 w-full px-2 pb-4 pt-1 flex-wrap border-b border-default">
					<slot name="header-extra" />
				</div>
			</template>
			<!-- Slot par défaut : si fourni ET activé, remplace le VChart (ex: pour une table) -->
			<slot v-if="useDefaultSlot" />
			<div
				v-else
				ref="chartContainerRef"
				class="relative w-full flex-1 min-h-0"
				style="min-height: 200px;"
			>
				<VChart v-if="(!hideChartWhileLoading || !loading) && containerHeight > 0" :option="chartOption" autoresize :style="{ width: '100%', height: (canvasHeight || containerHeight || 200) + 'px' }" />
			</div>
		</UCard>

		<div v-if="loading" :class="hideChartWhileLoading ? 'bg-default' : 'bg-white/50 dark:bg-gray-900/50'" class="absolute inset-0 z-10 rounded"></div>
		<div v-if="loading" class="absolute inset-0 flex items-center justify-center z-20">
			<UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { onMounted, onActivated, onDeactivated } from 'vue'

const props = defineProps<{
	title: string
	enlargedTitle: string
	chartOption?: EChartsOption
	canvasHeight?: number
	loading?: boolean
	hideChartWhileLoading?: boolean
	modalMaxWidth?: string
	modalHeightClass?: string
	subtitle?: string
	// Classe CSS additionnelle pour le titre (ex: couleur verte/rouge)
	titleClass?: string
	// Rend le fond du UCard transparent
	transparent?: boolean
	// Masque le bouton "enlarge" (ex: pour les tables qui n'ont pas de version agrandie)
	hideEnlarge?: boolean
	// Active l'utilisation du slot default à la place du VChart (ex: pour les tables)
	useDefaultSlot?: boolean
}>()

const hideChartWhileLoading = computed(() => props.hideChartWhileLoading ?? false)

const isModalOpen = ref(false)
const isSettingsOpen = ref(false)

const chartContainerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(250)
const isActive = ref(true)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
	if (chartContainerRef.value) {
		containerHeight.value = chartContainerRef.value.clientHeight
		resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
			if (!isActive.value) return
			const entry = entries[0]
			if (entry) {
				containerHeight.value = entry.contentRect.height
			}
		})
		resizeObserver.observe(chartContainerRef.value)
	}
})

onBeforeUnmount(() => {
	if (resizeObserver) {
		resizeObserver.disconnect()
		resizeObserver = null
	}
})

onActivated(() => {
	isActive.value = true
})

onDeactivated(() => {
	isActive.value = false
})
</script>
