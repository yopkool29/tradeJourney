<template>
	<div class="relative">
		<UCard class="h-full flex flex-col" :ui="{ header: 'p-0 flex-shrink-0', body: 'flex-1 flex flex-col min-h-0 p-2' }">
			<template #header>
				<div class="flex items-center gap-2 w-full px-2 py-1">
					<span class="font-semibold">{{ title }}</span>
					<button
						class="ml-auto px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
						:title="enlargedTitle"
						@click="isModalOpen = true"
					>
						<UIcon name="i-heroicons-arrows-pointing-out" class="w-4 h-4" />
					</button>
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
				<VChart v-show="!hideChartWhileLoading || !loading" :option="chartOption" autoresize :style="{ width: '100%', height: (canvasHeight || containerHeight) + 'px' }" />
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
import { onMounted } from 'vue'
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

const chartContainerRef = ref<HTMLElement | null>(null)
const containerHeight = ref(250)

onMounted(() => {
	if (chartContainerRef.value) {
		containerHeight.value = chartContainerRef.value.clientHeight
	}
})

useResizeObserver(chartContainerRef, (entries) => {
	const entry = entries[0]
	if (entry) {
		containerHeight.value = entry.contentRect.height
	}
})
</script>
