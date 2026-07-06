import type { TJPluginSdk } from '~/type/plugin'
import SchwabConverterView from './SchwabConverterView.vue'
import { markRaw } from 'vue'

const plugin = {
	id: 'schwab-converter',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'schwab-converter-open',
			label: 'Schwab Options Converter',
			icon: 'i-heroicons-document-arrow-up',
			run() {
				sdk.ui.openModal('schwab-converter-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'schwab-converter-modal',
			title: 'Schwab Options Converter',
			component: markRaw(SchwabConverterView),
		})
	},
}

export default plugin
