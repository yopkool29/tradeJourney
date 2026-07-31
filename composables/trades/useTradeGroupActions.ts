import type { TradeExtendedType } from '~/schema/trade'
import type { DayTagType } from '~/schema/dayTag'

export const useTradeGroupActions = (
	groupTrades: Ref<TradeExtendedType[]>,
	groupDate: Ref<Date | null>,
	emit: (event: 'tradeStatusChanged', tradeId: number, active: boolean) => void,
) => {
	const { t } = useI18n()
	const { log_error } = useLogView()
	const { fetchTrade, updateTrade, deleteTrade, unDeleteTrade } = useTrades()
	const { cleanupOrphanImages } = useNoteImages()
	const { deleteDayTag } = useDayTags()
	const { deleteTradeTags } = useTradeTags()
	const { getTagById } = useTags()
	const dbStateStore = useDbStateStore()

	const showDayTagModal = ref(false)
	const showScreenshots = ref(false)
	const currentScreenshots = ref<Array<{ id?: number; url: string }>>([])
	const showClearTagsModal = ref(false)
	const showClearDayTagsModal = ref(false)
	const showClearDetailedNoteModal = ref(false)
	const selectedTrade = ref<TradeExtendedType | null>(null)
	const selectedTradeForDetailedNote = ref<TradeExtendedType | null>(null)
	const selectedTradeDetail = ref<TradeExtendedType | null>(null)
	const showTradeDetailModal = ref(false)
	const showDirectDetailedNote = ref(false)
	const directDetailedNote = ref('')
	const selectedTradeForNote = ref<TradeExtendedType | null>(null)
	const showEditTrade = ref(false)
	const editingTrade = ref<TradeExtendedType | null>(null)

	const currentDayTag = computed(() => {
		if (!groupDate.value) return null
		return dbStateStore.dayTags.find((dt: DayTagType) => {
			const dtDateStr = normalizeDateToUTCString(new Date(dt.date))
			const dateStr = formatDateToYYYYMMDD(groupDate.value!)
			return dtDateStr === dateStr
		}) || null
	})

	const dayTagTags = computed(() => {
		if (!currentDayTag.value?.tags) return []
		return currentDayTag.value.tags.map(tag => getTagById(tag.id)).filter(tag => tag !== null)
	})

	const totalScreenshots = computed(() => {
		return groupTrades.value.reduce((total, trade) => {
			const screenshots = trade.screenshots?.length || 0
			const hasScreenshotUrl = trade.screenshotUrl ? 1 : 0
			return total + screenshots + hasScreenshotUrl
		}, 0)
	})

	const hasDetailedNote = computed(() => {
		return groupTrades.value.some(trade => {
			const detailedNote = (trade.metadata as Record<string, unknown>)?.detailedNote as string
			return detailedNote && detailedNote.length > 0
		})
	})

	const openScreenshotsModal = (trade: TradeExtendedType) => {
		const screenshots = [
			...(trade.screenshots || []),
			...(trade.screenshotUrl && !(trade.screenshots || []).some(s => s.url === trade.screenshotUrl)
				? [{ url: trade.screenshotUrl }]
				: []),
		]
		currentScreenshots.value = screenshots
		showScreenshots.value = true
	}

	const openDayTagModal = () => {
		showDayTagModal.value = true
	}

	const { open: openTagModal } = useTradeTagModal()

	const openTradeTagModal = (trade: TradeExtendedType) => {
		openTagModal(trade, async () => {
			const result = await fetchTrade(trade.id)
			if (!result) return
			trade.note = result.note
			trade.tags = result.tags
			trade.screenshots = result.screenshots
			trade.screenshotUrl = result.screenshotUrl
			trade.metadata = result.metadata
		})
	}

	const confirmClearTradeTags = (trade: TradeExtendedType) => {
		selectedTrade.value = trade
		if (useUserStore().user?.settings_object?.deleteConfirmationNoteTags === false) {
			onClearTradeNoteTags()
		} else {
			showClearTagsModal.value = true
		}
	}

	const confirmClearDayTradeTags = () => {
		if (useUserStore().user?.settings_object?.deleteConfirmationNoteTags === false) {
			onClearDayNoteTags()
		} else {
			showClearDayTagsModal.value = true
		}
	}

	const onClearTradeNoteTags = async () => {
		if (!selectedTrade.value || !selectedTrade.value.id) return
		try {
			await deleteTradeTags(selectedTrade.value.id)
			await updateTrade({
				id: selectedTrade.value.id,
				note: '',
				screenshots: [],
			})
			const result = await fetchTrade(selectedTrade.value.id)
			if (result && selectedTrade.value) {
				selectedTrade.value.note = result.note
				selectedTrade.value.tags = result.tags
				selectedTrade.value.screenshots = result.screenshots
				selectedTrade.value.screenshotUrl = result.screenshotUrl
			}
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		}
	}

	const onActivate = async (tradeId: number) => {
		await unDeleteTrade(tradeId)
		const trade = groupTrades.value.find(t => t.id === tradeId)
		if (trade) trade.active = true
		emit('tradeStatusChanged', tradeId, true)
	}

	const onDeactivate = async (tradeId: number) => {
		await deleteTrade(tradeId)
		const trade = groupTrades.value.find(t => t.id === tradeId)
		if (trade) trade.active = false
		emit('tradeStatusChanged', tradeId, false)
	}

	const onClearDayNoteTags = async () => {
		try {
			if (!currentDayTag.value?.id) return
			await deleteDayTag(currentDayTag.value.id)
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		}
	}

	const openTradeDetailModal = (trade: TradeExtendedType) => {
		selectedTradeDetail.value = trade
		showTradeDetailModal.value = true
	}

	const onEditTrade = (trade: TradeExtendedType) => {
		editingTrade.value = { ...trade }
		showEditTrade.value = true
	}

	const onTradeSaved = async () => {
		const savedId = editingTrade.value?.id
		showEditTrade.value = false
		editingTrade.value = null
		if (savedId) {
			const result = await fetchTrade(savedId)
			if (result) {
				const trade = groupTrades.value.find(t => t.id === savedId)
				if (trade) Object.assign(trade, result)
			}
		}
		emit('tradeStatusChanged', 0, true)
	}

	const openDirectDetailedNote = async (trade: TradeExtendedType) => {
		selectedTradeForNote.value = trade
		const fetched = await fetchTrade(trade.id)
		directDetailedNote.value = (fetched?.metadata as Record<string, unknown>)?.detailedNote as string || ''
		showDirectDetailedNote.value = true
	}

	const onDirectDetailedNoteClose = async () => {
		if (!selectedTradeForNote.value) return
		await updateTrade({ id: selectedTradeForNote.value.id, detailedNote: directDetailedNote.value })
		const result = await fetchTrade(selectedTradeForNote.value.id)
		if (result) selectedTradeForNote.value.metadata = result.metadata
	}

	const onClearDetailedNote = async (trade: TradeExtendedType) => {
		selectedTradeForDetailedNote.value = trade
		if (useUserStore().user?.settings_object?.deleteConfirmationNoteTags === false) {
			await executeClearDetailedNote()
		} else {
			showClearDetailedNoteModal.value = true
		}
	}

	const executeClearDetailedNote = async () => {
		if (!selectedTradeForDetailedNote.value) return
		try {
			const oldContent = (selectedTradeForDetailedNote.value.metadata as Record<string, unknown>)?.detailedNote as string || ''
			await updateTrade({ id: selectedTradeForDetailedNote.value.id, detailedNote: '' })
			await cleanupOrphanImages(oldContent, '')
			const result = await fetchTrade(selectedTradeForDetailedNote.value.id)
			if (result) selectedTradeForDetailedNote.value.metadata = result.metadata
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		}
	}

	return {
		showDayTagModal, showScreenshots, currentScreenshots,
		showClearTagsModal, showClearDayTagsModal, showClearDetailedNoteModal,
		selectedTrade, selectedTradeForDetailedNote,
		selectedTradeDetail, showTradeDetailModal,
		showDirectDetailedNote, directDetailedNote, selectedTradeForNote,
		showEditTrade, editingTrade,
		currentDayTag, dayTagTags, totalScreenshots, hasDetailedNote,
		openScreenshotsModal, openDayTagModal, openTradeTagModal,
		confirmClearTradeTags, confirmClearDayTradeTags,
		onClearTradeNoteTags, onActivate, onDeactivate, onClearDayNoteTags,
		openTradeDetailModal, onEditTrade, onTradeSaved,
		openDirectDetailedNote, onDirectDetailedNoteClose,
		onClearDetailedNote, executeClearDetailedNote,
	}
}
