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
	description?: string
	message?: string
	component?: unknown
	onClose?: () => void
	closeLabel?: string
	closeColor?: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success'
	closeVariant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'link'
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
	post: <T = unknown>(path: string, body: Record<string, unknown>) => Promise<T>
	put: <T = unknown>(path: string, body: Record<string, unknown>) => Promise<T>
	delete: <T = unknown>(path: string) => Promise<T>
}

type TJPluginUtils = {
	getPNL: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getAPPT: (trades: { profit: number; netProfit: number }[], fixNanToZero: boolean, round?: number, useNet?: boolean) => number
	getPLRatio: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getWinrate: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getNbTrades: (trades: { closeDate: Date | string }[], date: Date) => number
	getWinLossNb: (trades: { closeDate: Date | string; profit: number; netProfit: number }[], date: Date, useNet?: boolean) => { wins: number; losses: number }
	movingAverage: (data: number[], windowSize: number) => number[]
	getProfitFactor: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getRecoveryFactor: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getSharpeRatio: (trades: { profit: number; netProfit: number; openDate?: Date | string }[], riskFreeRate?: number, round?: number, useNet?: boolean) => number
	getAvgTradeDuration: (trades: { openDate: Date | string, closeDate: Date | string }[], round?: number) => number
	getMaxTradeDuration: (trades: { openDate: Date | string, closeDate: Date | string }[], round?: number) => number
	getExpectancy: (trades: { profit: number; netProfit: number }[], round?: number, useNet?: boolean) => number
	getStdDev: (values: number[], round?: number) => number
	getTotalContracts: (trades: { lot: number }[]) => number
	getWinningTradesMetrics: (trades: { profit: number; netProfit: number; lot: number; commission?: number; openDate: Date | string; closeDate: Date | string }[], useNet?: boolean) => {
		count: number
		totalProfit: number
		totalContracts: number
		largest: number
		average: number
		stdDev: number
		avgDuration: number
		maxDuration: number
		totalCommission: number
	}
	getLosingTradesMetrics: (trades: { profit: number; netProfit: number; lot: number; commission?: number; openDate: Date | string; closeDate: Date | string }[], useNet?: boolean) => {
		count: number
		totalLoss: number
		totalContracts: number
		largest: number
		average: number
		stdDev: number
		avgDuration: number
		maxDuration: number
		totalCommission: number
	}
	getBreakevenTradesMetrics: (trades: { profit: number; netProfit: number; lot: number }[], useNet?: boolean) => {
		count: number
		totalContracts: number
	}
	getMaxWinningStreak: (trades: { profit: number; netProfit: number }[], useNet?: boolean) => number
	getMaxLosingStreak: (trades: { profit: number; netProfit: number }[], useNet?: boolean) => number
	getMaxDrawdownWithDates: (trades: { profit: number; netProfit: number; closeDate: Date | string }[], useNet?: boolean) => {
		maxDrawdown: number
		dateFrom: Date | null
		dateTo: Date | null
	}
	getMaxRunUpWithDates: (trades: { profit: number; netProfit: number; closeDate: Date | string }[], useNet?: boolean) => {
		maxRunUp: number
		dateFrom: Date | null
		dateTo: Date | null
	}
}

export type TJPluginSdk = {
	api: TJPluginApi
	utils: TJPluginUtils
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

export type TJPluginPageSlot = {
	id: string
	slotId: string
	pluginId: string
	label: string
	icon?: string
	onClick: () => void
}

export type TJPluginPageSlotRegistered = TJPluginPageSlot
