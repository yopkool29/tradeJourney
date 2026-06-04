import VueECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
} from 'echarts/components'

use([
	CanvasRenderer,
	BarChart,
	LineChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
])

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.component('VChart', VueECharts)
})
