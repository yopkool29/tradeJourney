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
import type { PropType } from 'vue'

const modelValue = defineModel<boolean>('modelValue', { required: true })

defineProps({
	title: {
		type: String,
		required: true,
	},
	chartOption: {
		type: Object as PropType<EChartsOption>,
		required: true,
	},
	contentHeight: {
		type: Number,
		default: 600,
	},
	chartHeight: {
		type: Number,
		default: 600,
	},
})
</script>
