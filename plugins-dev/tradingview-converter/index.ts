import type { TJPluginSdk } from '~/type/plugin'
import TradingViewConverterView from './TradingViewConverterView.vue'
import { markRaw } from 'vue'

const plugin = {
	id: 'tradingview-converter',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'tradingview-converter-open',
			label: 'TradingView Converter',
			icon: 'i-heroicons-chart-bar',
			run() {
				sdk.ui.openModal('tradingview-converter-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'tradingview-converter-modal',
			title: 'TradingView Converter',
			component: markRaw(TradingViewConverterView),
            hideCloseButton: true,
		})
	},
}

export default plugin
