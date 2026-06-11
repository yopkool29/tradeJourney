<template>
	<CommonModalChart v-model="modelValue" :title="title">
		<template #content>
			<div :style="{ height: contentHeight + 'px' }" class="overflow-y-auto">
				<VChart :option="chartOption" autoresize :style="{ width: '100%', height: chartHeight + 'px' }" />
			</div>
		</template>
	</CommonModalChart>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const modelValue = defineModel<boolean>('modelValue', { required: true })

const props = withDefaults(defineProps<{
	title: string
	chartOption: EChartsOption
	contentHeight?: number
	chartHeight?: number
}>(), {
	contentHeight: 600,
	chartHeight: 600,
})
</script>
