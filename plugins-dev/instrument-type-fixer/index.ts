import type { TJPluginSdk } from '~/type/plugin'
import InstrumentTypeFixerView from './InstrumentTypeFixerView.vue'
import { markRaw } from 'vue'

const plugin = {
	id: 'instrument-type-fixer',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'instrument-type-fixer-open',
			label: 'Instrument Type Fixer',
			icon: 'i-heroicons-tag',
			run() {
				sdk.ui.openModal('instrument-type-fixer-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'instrument-type-fixer-modal',
			title: 'Fixer le type d\'instrument',
			component: markRaw(InstrumentTypeFixerView),
		})

		// sdk.ui.registerPageSlot('page-dashboard', {
		// 	id: 'instrument-type-fixer-dashboard',
		// 	label: 'Instrument Type Fixer',
		// 	icon: 'i-heroicons-tag',
		// 	onClick() {
		// 		sdk.ui.openModal('instrument-type-fixer-modal')
		// 	},
		// })
	},
}

export default plugin
