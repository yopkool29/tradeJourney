import VueECharts, { INIT_OPTIONS_KEY } from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
	GridComponent,
	TooltipComponent,
	LegendComponent,
	GraphicComponent,
} from 'echarts/components'

use([
	CanvasRenderer,
	BarChart,
	LineChart,
	PieChart,
	GridComponent,
	TooltipComponent,
	LegendComponent,
	GraphicComponent,
])

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.component('VChart', VueECharts)
	nuxtApp.vueApp.provide(INIT_OPTIONS_KEY, { devicePixelRatio: 2 })

	if (import.meta.client) {
		const original = EventTarget.prototype.addEventListener
		EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
			if (type === 'wheel' || type === 'mousewheel') {
				const patched = typeof options === 'boolean'
					? { capture: options, passive: true }
					: { ...(options || {}), passive: true }
				return original.call(this, type, listener as EventListenerOrEventListenerObject, patched)
			}
			return original.call(this, type, listener as EventListenerOrEventListenerObject, options)
		}
	}
})
