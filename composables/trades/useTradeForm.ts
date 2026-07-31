import { CreateTradeSchema } from '~/schema/trade'
import type { CreateTradeType, UpdateTradeType, TradeType } from '~/schema/trade'
import type { SymbolType } from '~/schema/symbol'
import { calculateRiskReward } from '~/utils/rMultiple'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'

export const useTradeForm = (emit: (event: 'saved') => void) => {
	const { symbols: availableSymbols, fetchActiveSymbols } = useSymbols()
	const { createTrade, updateTrade } = useTrades()
	const { accounts, fetchAccounts } = useAccount()
	const { errorStr, successStr, displayMessage } = useAlert()
	const { t } = useI18n()
	const isLoading = ref(false)

	const selectedSymbol = ref<{ id: number; symbol: string; digit: number }>()

	const getDefaultForm = () =>
		({
			accountId: -1,
			openDate: new Date(),
			closeDate: new Date(),
			symbol: '',
			type: 'buy',
			lot: 0,
			openPrice: 0,
			closePrice: 0,
			stopLoss: 0,
			takeProfit: 0,
			profit: 0,
			netProfit: 0,
			instrumentType: 'any',
			commission: 0,
			exchange: 0,
			screenshotUrl: null,
			metadata: {},
			riskReward: undefined,
		}) as CreateTradeType

	const newState = ref<CreateTradeType>(getDefaultForm())

	const { screenshots, initializeScreenshots, prepareForUpdate, uploadNewScreenshots, cleanup } = useSharedScreenshots(3)

	const onError = (event: FormErrorEvent) => {
		const errorMessage = t('components.trade.formModal.errors.form')
		displayMessage(null, errorMessage)
		const val = event?.errors?.[0]
		if (val) {
			if (val.id) {
				const element = document.getElementById(val.id)
				element?.focus()
			} else {
				const specificError = t('components.trade.formModal.errors.specific', { message: val.message, name: val.name })
				displayMessage(null, specificError)
			}
		}
	}

	const openDateStr = computed({
		get: () => getDatetimeLocalNow(newState.value.openDate),
		set: (value) => { newState.value.openDate = value },
	})

	const closeDateStr = computed({
		get: () => getDatetimeLocalNow(newState.value.closeDate),
		set: (value) => { newState.value.closeDate = value },
	})

	function initializeScreenshotsFrom(trade: TradeType) {
		if (trade.screenshots && trade.screenshots.length > 0) {
			const existingScreenshotsData = trade.screenshots
				.filter((s) => s.id !== undefined)
				.map((s) => ({ id: s.id as number, url: s.url }))
			initializeScreenshots(existingScreenshotsData)
		} else if (trade.screenshotUrl) {
			initializeScreenshots([{ id: 0, url: trade.screenshotUrl }])
		} else {
			initializeScreenshots([])
		}
	}

	function newForm() {
		errorStr.value = null
		newState.value = getDefaultForm()
		initializeScreenshots([])
	}

	const isRiskRewardNegative = computed(() => {
		const value = Number(newState.value.riskReward)
		return !isNaN(value) && value < 0
	})

	const canCalculateRR = computed(() =>
		calculateRiskReward(
			newState.value.type as 'buy' | 'sell',
			Number(newState.value.openPrice) || 0,
			Number(newState.value.stopLoss) || 0,
			Number(newState.value.takeProfit) || 0,
		) !== null,
	)

	function calculateRR() {
		const calculated = calculateRiskReward(
			newState.value.type as 'buy' | 'sell',
			Number(newState.value.openPrice) || 0,
			Number(newState.value.stopLoss) || 0,
			Number(newState.value.takeProfit) || 0,
		)
		if (calculated !== null) {
			const value = Number(calculated.toFixed(2))
			const capped = Math.min(value, 50)
			newState.value.riskReward = capped < 0 ? 0 : capped
		}
	}

	function clearRR() {
		newState.value.riskReward = 0
	}

	function editForm(trade: TradeType) {
		errorStr.value = null
		const metadata = trade.metadata as Record<string, unknown> | null | undefined
		newState.value = { ...trade, metadata: trade.metadata ?? {}, riskReward: metadata?.riskReward as number | undefined }
		initializeScreenshotsFrom(trade)
	}

	async function onSubmit(event: FormSubmitEvent<CreateTradeType | UpdateTradeType>) {
		isLoading.value = true
		try {
			let saved: TradeType
			if ('id' in event.data && event.data.id) {
				const existingScreenshotsToKeep = prepareForUpdate()
				saved = await updateTrade({ ...event.data, screenshots: existingScreenshotsToKeep } as UpdateTradeType)
				displayMessage(t('components.trade.formModal.success.updated_title'), null)
			} else {
				saved = await createTrade({ ...event.data } as CreateTradeType)
				displayMessage(t('components.trade.formModal.success.created_title'), null)
			}
			if (saved && saved.id) {
				await uploadNewScreenshots(saved.id)
			}
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			displayMessage(null, message)
		} finally {
			cleanup()
			emit('saved')
			isLoading.value = false
		}
	}

	const onSymbolCreated = async (symbol: SymbolType) => {
		displayMessage(t('components.settings.tradingSymbols.symbol_created'), null)
		await fetchActiveSymbols()
		newState.value.symbol = symbol.symbol
	}

	const onSymbolError = (error: string | null) => {
		if (error) displayMessage(null, error)
	}

	const step = computed(() => {
		if (selectedSymbol.value?.digit !== undefined) {
			return 1 / Math.pow(10, selectedSymbol.value.digit)
		}
		return 0.00001
	})

	return {
		CreateTradeSchema,
		availableSymbols, fetchActiveSymbols,
		accounts, fetchAccounts,
		errorStr, successStr, displayMessage,
		isLoading,
		selectedSymbol,
		newState, screenshots,
		openDateStr, closeDateStr,
		isRiskRewardNegative, canCalculateRR, step,
		onError, newForm, editForm, onSubmit,
		calculateRR, clearRR,
		onSymbolCreated, onSymbolError,
	}
}
