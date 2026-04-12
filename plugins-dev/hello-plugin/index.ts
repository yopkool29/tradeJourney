import type { TJPluginSdk } from '../type/plugin'

const plugin = {
	id: 'hello-plugin',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'hello-plugin-open',
			label: 'Hello Plugin',
			icon: 'i-heroicons-sparkles',
			run() {
				sdk.ui.openModal('hello-plugin-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'hello-plugin-modal',
			title: 'Hello depuis le plugin !',
			message: 'Ce plugin a été chargé dynamiquement sans rebuild de TradeJourney.',
			onClose() {
				sdk.ui.toast.success('Hello Plugin fermé !')
			},
		})
	},
}

export default plugin
