declare module 'vue-grid-layout-v3' {
	import type { DefineComponent } from 'vue'

	export const GridLayout: DefineComponent<{
		layout: Array<{ x: number; y: number; w: number; h: number; i: string }>
		'col-num'?: number
		'row-height'?: number
		'margin'?: [number, number]
		'is-draggable'?: boolean
		'is-resizable'?: boolean
		'vertical-compact'?: boolean
		'use-css-transforms'?: boolean
		'responsive'?: boolean
		'breakpoints'?: Record<string, number>
		'cols'?: Record<string, number>
	}>

	export const GridItem: DefineComponent<{
		x: number
		y: number
		w: number
		h: number
		i: string
		'is-draggable'?: boolean
		'is-resizable'?: boolean
		'min-w'?: number
		'min-h'?: number
		'max-w'?: number
		'max-h'?: number
	}>
}
