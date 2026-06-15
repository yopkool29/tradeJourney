<template>
	<div class="relative group">
		<UCard class="h-full flex flex-col" :ui="{ header: 'p-0 flex-shrink-0', body: 'flex-1 flex flex-col min-h-0 p-2' }">
			<template #header>
				<div class="flex items-center gap-2 w-full px-2 py-1">
					<span class="font-semibold">{{ title }}</span>
					<div class="ml-auto flex items-center gap-1">
						<UPopover v-if="$slots.settings" v-model:open="isSettingsOpen">
							<button
								class="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
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
							class="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
							:title="enlargedTitle"
							@click="isModalOpen = true"
						>
							<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
						</button>
					</div>
					<CommonModalChart v-model="isModalOpen" :title="enlargedTitle">
						<template #content>
							<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
						</template>
					</CommonModalChart>
				</div>
			</template>
			<div
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
import { useResizeObserver } from '@vueuse/core'

const props = defineProps<{
	title: string
	enlargedTitle: string
	chartOption: EChartsOption
	canvasHeight?: number
	loading?: boolean
	hideChartWhileLoading?: boolean
}>()

const hideChartWhileLoading = computed(() => props.hideChartWhileLoading ?? false)

const isModalOpen = ref(false)
const isSettingsOpen = ref(false)

const chartContainerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(250)
const isActive = ref(true)

onMounted(() => {
	if (chartContainerRef.value) {
		containerHeight.value = chartContainerRef.value.clientHeight
	}
})

onActivated(() => {
	isActive.value = true
})

onDeactivated(() => {
	isActive.value = false
})

useResizeObserver(chartContainerRef, (entries: ResizeObserverEntry[]) => {
	if (!isActive.value) return
	const entry = entries[0]
	if (entry) {
		containerHeight.value = entry.contentRect.height
	}
})
</script>
