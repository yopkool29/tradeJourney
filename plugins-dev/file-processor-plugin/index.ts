import type { TJPluginSdk } from '~/type/plugin'
import FileProcessorView from './FileProcessorView.vue'
import { markRaw } from 'vue'

const plugin = {
	id: 'file-processor-plugin',
	install(sdk: TJPluginSdk) {
		sdk.ui.registerAction({
			id: 'file-processor-plugin-open',
			label: 'File Processor',
			icon: 'i-heroicons-document-arrow-up',
			run() {
				sdk.ui.openModal('file-processor-plugin-modal')
			},
		})

		sdk.ui.registerModal({
			id: 'file-processor-plugin-modal',
			title: 'File Processor',
			component: markRaw(FileProcessorView),
		})

		sdk.ui.registerPageSlot('page-dashboard', {
			id: 'file-processor-plugin-dashboard',
			label: 'File Processor',
			icon: 'i-heroicons-document-arrow-up',
			onClick() {
				sdk.ui.openModal('file-processor-plugin-modal')
			},
		})
	},
}

export default plugin
