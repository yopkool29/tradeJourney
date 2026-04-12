import type { TJPluginSdk } from '../type/plugin'
import TradeStatsView from './TradeStatsView.vue'

const plugin = {
	id: 'trade-stats-plugin',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'trade-stats-plugin-open',
			label: 'Trade Stats',
			icon: 'i-heroicons-chart-bar-square',
			run() {
				sdk.ui.openModal('trade-stats-plugin-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'trade-stats-plugin-modal',
			title: 'Statistiques de trading',
			component: TradeStatsView,
		})

		sdk.ui.registerPageSlot('page-dashboard', {
			id: 'trade-stats-plugin-dashboard',
			label: 'Stats rapides',
			icon: 'i-heroicons-chart-bar-square',
			onClick() {
				sdk.ui.openModal('trade-stats-plugin-modal')
			},
		})
	},
}

export default plugin
