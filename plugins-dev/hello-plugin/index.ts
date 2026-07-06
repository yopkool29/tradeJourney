import type { TJPluginSdk } from '../../type/plugin'

const plugin = {
	id: 'hello-plugin',
	install(sdk: TJPluginSdk) {
		const register = () => {
			const isFr = sdk.ui.getLocale() === 'fr'
            const t = sdk.ui.t

			const labels = {
				actionLabel: isFr ? 'Plugin Bonjour' : 'Hello Plugin',
				modalTitle: isFr ? 'Bonjour depuis le plugin !' : 'Hello from the plugin!',
				modalMessage: isFr
					? 'Ce plugin a été chargé dynamiquement sans rebuild de PnlTracker.'
					: 'This plugin was loaded dynamically without rebuilding PnlTracker.',
				closeLabel: t('common.actions.close'),
				toastClosed: isFr ? 'Plugin fermé !' : 'Plugin closed!',
				exportLabel: isFr ? 'Export CSV' : 'CSV Export',
				exportToast: isFr ? 'Export CSV démarré !' : 'CSV export started!',
			}

			// Action globale dans Settings > Plugins
			sdk.ui.registerAction({
				id: 'hello-plugin-open',
				label: labels.actionLabel,
				icon: 'i-heroicons-sparkles',
				run() {
					sdk.ui.openModal('hello-plugin-modal')
				},
			})

			// Modal
			sdk.ui.registerModal({
				id: 'hello-plugin-modal',
				title: labels.modalTitle,
				message: labels.modalMessage,
				closeLabel: labels.closeLabel,
				closeColor: 'primary',
				closeVariant: 'solid',
				onClose() {
					sdk.ui.toast.success(labels.toastClosed)
				},
			})

			// Slot: Dashboard - bouton Export
			sdk.ui.registerPageSlot('page-dashboard', {
				id: 'hello-plugin-dashboard-export',
				label: labels.exportLabel,
				icon: 'i-heroicons-arrow-down-tray',
				onClick() {
					sdk.ui.toast.success(labels.exportToast)
				},
			})

		}

		register()
		sdk.ui.onLocaleChange(register)
	},
}

export default plugin
