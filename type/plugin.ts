type ToastFn = (message: string) => void

type TJPluginAction = {
	id: string
	label: string
	icon?: string
	run: () => void
}

type TJPluginModal = {
	id: string
	title: string
	message: string
	onClose?: () => void
}

type TJPluginUi = {
	toast: {
		success: ToastFn
		error: ToastFn
	}
	registerAction: (action: TJPluginAction) => void
	registerModal: (modal: TJPluginModal) => void
	openModal: (id: string) => void
	registerPageSlot: (slotId: string, config: { id: string; label: string; icon?: string; onClick: () => void }) => void
}

type TJPluginApi = {
	get: <T = unknown>(path: string) => Promise<T>
	post: <T = unknown>(path: string, body: unknown) => Promise<T>
	put: <T = unknown>(path: string, body: unknown) => Promise<T>
	delete: <T = unknown>(path: string) => Promise<T>
}

export type TJPluginSdk = {
	api: TJPluginApi
	ui: TJPluginUi
}

export type TJPlugin = {
	id: string
	install: (sdk: TJPluginSdk) => void
}

export type TJPluginManifest = {
	id: string
	name: string
	version: string
	description: string
	isUploaded?: boolean
}

export type TJPluginRegistered = TJPluginAction

export type TJPluginModalRegistered = TJPluginModal

type TJPluginPageSlot = {
	id: string
	slotId: string
	pluginId: string
	label: string
	icon?: string
	onClick: () => void
}

export type TJPluginPageSlotRegistered = TJPluginPageSlot
