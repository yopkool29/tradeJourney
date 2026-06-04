<template>
	<div class="relative">
		<UCard class="h-full" :ui="{ header: 'p-0' }">
			<template #header>
				<div class="flex items-center gap-2 w-full">
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
				class="relative w-full"
				:style="{ height: `${canvasHeight}px` }"
				style="cursor: crosshair;"
				@click="isModalOpen = true"
			>
				<VChart :option="chartOption" autoresize style="width: 100%; height: 100%;" />
			</div>
		</UCard>

		<div v-if="loading" class="absolute inset-0 bg-white/50 dark:bg-gray-900/50 z-10 rounded"></div>
		<div v-if="loading" class="absolute inset-0 flex items-center justify-center z-20">
			<UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = defineProps<{
	title: string
	enlargedTitle: string
	chartOption: EChartsOption
	canvasHeight: number
	loading?: boolean
}>()

const isModalOpen = ref(false)
</script>
