import type { TJPluginSdk } from '../type/plugin'

const plugin = {
	id: 'hello-plugin',
	install(sdk: TJPluginSdk) {
		// Action globale dans Settings > Plugins
		sdk.ui.registerAction({
			id: 'hello-plugin-open',
			label: 'Hello Plugin',
			icon: 'i-heroicons-sparkles',
			run() {
				sdk.ui.openModal('hello-plugin-modal')
			},
		})

		// Modal
		sdk.ui.registerModal({
			id: 'hello-plugin-modal',
			title: 'Hello depuis le plugin !',
			message: 'Ce plugin a été chargé dynamiquement sans rebuild de TradeJourney.',
			onClose() {
				sdk.ui.toast.success('Hello Plugin fermé !')
			},
		})

		// Slot: Dashboard - bouton Export
		sdk.ui.registerPageSlot('page-dashboard', {
			id: 'hello-plugin-dashboard-export',
			label: 'Export CSV',
			icon: 'i-heroicons-arrow-down-tray',
			onClick() {
				sdk.ui.toast.success('Export CSV démarré !')
			},
		})

		// Slot: Transactions - bouton Analyse
		sdk.ui.registerPageSlot('page-trade', {
			id: 'hello-plugin-trade-analyze',
			label: 'Analyse IA',
			icon: 'i-heroicons-bolt',
			onClick() {
				sdk.ui.openModal('hello-plugin-modal')
			},
		})

		// Slot: Calendrier - bouton Sync
		sdk.ui.registerPageSlot('page-calendar', {
			id: 'hello-plugin-calendar-sync',
			label: 'Sync Cal',
			icon: 'i-heroicons-calendar-days',
			onClick() {
				sdk.ui.toast.success('Calendrier synchronisé !')
			},
		})

		// Slot: Journal - bouton Stats
		sdk.ui.registerPageSlot('page-daily', {
			id: 'hello-plugin-daily-stats',
			label: 'Stats Jour',
			icon: 'i-heroicons-chart-bar',
			onClick() {
				sdk.ui.toast.success('Statistiques journal calculées !')
			},
		})
	},
}

export default plugin
