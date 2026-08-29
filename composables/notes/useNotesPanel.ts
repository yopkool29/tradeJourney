import type { NoteType } from '~/schema/note'
import { formatDateToYYYYMMDD } from '~/utils/date-utils'

export const useNotesPanel = () => {
	const { fetchNoteDates, fetchNotesByDate, saveNote: saveNoteToApi, updateNote, deleteNote } = useNotes()
	const { log_error } = useLogView()
	const { success: toastSuccess } = useAppToast()
	const { t } = useI18n()
	const dbStateStore = useDbStateStore()
	const { uploadContext, cleanupOrphanImages, cleanupTmpImages, finalizeImages, deleteNoteImages } = useNoteImages()

	const loading = ref(false)
	const noteDates = ref<NoteType[]>([])
	const selectedNote = ref<NoteType | null>(null)
	const showDeleteModal = ref(false)
	const noteToDelete = ref<NoteType | null>(null)
	const showUnsavedModal = ref(false)
	const savedContent = ref('')
	const pendingAction = ref<(() => void) | null>(null)

	const showCreateModal = ref(false)
	const createNoteDate = ref('')
	const createNoteTime = ref('')
	const createNoteSubtitle = ref('')

	const showChangeDateTimeModal = ref(false)
	const changeNoteDate = ref('')
	const changeNoteTime = ref('')

	const editorContent = ref('')
	const noteSubtitle = ref('')
	const savedSubtitle = ref('')

	// Pendant le chargement d'une note, Milkdown normalise le markdown et émet une version
	// potentiellement différente de celle du serveur. Ce flag désactive isDirty le temps
	// que cette normalisation soit terminée, puis synchronise savedContent.
	const isLoadingNote = ref(false)

	// Pendant le chargement, on synchronise savedContent en continu avec editorContent
	// pour suivre la normalisation Milkdown peu importe quand elle se produit.
	watch(editorContent, () => {
		if (isLoadingNote.value) {
			savedContent.value = editorContent.value
		}
	})

	const isDirty = computed(() => {
		if (isLoadingNote.value) return false
		return editorContent.value.trim() !== savedContent.value.trim() || noteSubtitle.value !== savedSubtitle.value
	})
	const isNewNote = computed(() => !!selectedNote.value && !selectedNote.value.id)
	const showDirtyIndicator = computed(() => isDirty.value || isNewNote.value)
	const selectedNoteId = computed(() => selectedNote.value?.id || null)
	const isMcpJournalNote = (note: NoteType) => new Date(note.date).getTime() === Date.UTC(1980, 0, 1)

	const noteDatesGrouped = computed(() => {
		const grouped = new Map<string, NoteType[]>()
		noteDates.value.forEach((note: NoteType) => {
			const dateKey = formatDateToYYYYMMDD(note.date)
			if (!grouped.has(dateKey)) grouped.set(dateKey, [])
			grouped.get(dateKey)!.push(note)
		})
		grouped.forEach((notes) => notes.sort((a, b) => Number(isMcpJournalNote(b)) - Number(isMcpJournalNote(a)) || new Date(b.date).getTime() - new Date(a.date).getTime()))
		return Array.from(grouped.entries())
			.map(([date, notes]) => ({ date, notes }))
			.sort((a, b) => Number(b.notes.some(isMcpJournalNote)) - Number(a.notes.some(isMcpJournalNote)) || new Date(b.date).getTime() - new Date(a.date).getTime())
	})

	const setContent = async (v: string) => { editorContent.value = v }
	const getContent = () => editorContent.value

	const doSelectNote = async (note: NoteType) => {
		// La note IA peut être modifiée externement par le MCP entre deux sélections.
		// On recharge sa version fraîche depuis l'API avant d'afficher pour éviter un flicker.
		let freshNote = note
		if (note.id && isMcpJournalNote(note)) {
			try {
				const notes = await fetchNotesByDate(note.date) as NoteType[]
				freshNote = notes.find((n: NoteType) => n.id === note.id) ?? note
			} catch {
				// si le refresh échoue on garde la version en cache
			}
		}
		isLoadingNote.value = true
		selectedNote.value = freshNote
		dbStateStore.setLastViewedNoteId(freshNote.id ?? null)
		const subtitle = freshNote.metadata?.subtitle || ''
		noteSubtitle.value = subtitle
		savedSubtitle.value = subtitle
		const c = freshNote.content || ''
		savedContent.value = c
		setContent(c)
		// Le watch sur editorContent synchronise savedContent pendant isLoadingNote.
		// On attend 500ms pour laisser à Milkdown le temps de normaliser, puis on
		// désactive le flag. Le watch a déjà sync savedContent avec la version normalisée.
		setTimeout(() => {
			isLoadingNote.value = false
		}, 500)
	}

	const selectNote = (note: NoteType) => {
		if (isDirty.value && selectedNote.value) {
			pendingAction.value = () => doSelectNote(note)
			showUnsavedModal.value = true
			return
		}
		doSelectNote(note)
	}

	const doOpenCreateModal = () => {
		const now = new Date()
		createNoteDate.value = formatDateToYYYYMMDD(now)
		createNoteTime.value = now.toTimeString().slice(0, 5)
		createNoteSubtitle.value = ''
		showCreateModal.value = true
	}

	const openCreateModal = () => {
		if (isDirty.value && selectedNote.value) {
			pendingAction.value = () => doOpenCreateModal()
			showUnsavedModal.value = true
			return
		}
		doOpenCreateModal()
	}

	const openChangeDateTimeModal = () => {
		if (!selectedNote.value) return
		const noteDate = new Date(selectedNote.value.date)
		changeNoteDate.value = formatDateToYYYYMMDD(noteDate)
		changeNoteTime.value = noteDate.toTimeString().slice(0, 5)
		showChangeDateTimeModal.value = true
	}

	const confirmChangeDateTime = async () => {
		if (!selectedNote.value) return
		const [hours, minutes] = changeNoteTime.value.split(':').map(Number)
		const parsed = new Date(changeNoteDate.value)
		parsed.setHours(hours, minutes, 0, 0)
		try {
			loading.value = true
			await updateNote(selectedNote.value.id, { date: parsed.toISOString() })
			showChangeDateTimeModal.value = false
			selectedNote.value.date = parsed.toISOString()
			await loadNotes()
			toastSuccess(t('components.notes_panel.change_datetime_modal.success'))
		} catch (error) {
			log_error('Failed to update note date/time:', error)
		} finally {
			loading.value = false
		}
	}

	const confirmCreateNote = async () => {
		const [hours, minutes] = createNoteTime.value.split(':').map(Number)
		const parsed = new Date(createNoteDate.value)
		parsed.setHours(hours, minutes, 0, 0)
		const newNote: Partial<NoteType> = {
			date: parsed.toISOString(),
			content: '',
			metadata: { subtitle: createNoteSubtitle.value },
		}
		noteSubtitle.value = createNoteSubtitle.value
		savedSubtitle.value = ''
		savedContent.value = ''
		selectedNote.value = newNote as NoteType
		setContent('')
		showCreateModal.value = false
	}

	const doCreateNewNote = (date: string) => {
		const parsed = new Date(date)
		const now = new Date()
		parsed.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
		const newNote: Partial<NoteType> = { date: parsed.toISOString(), content: '', metadata: {} }
		noteSubtitle.value = ''
		savedSubtitle.value = ''
		savedContent.value = ''
		selectedNote.value = newNote as NoteType
		setContent('')
	}

	const createNewNote = (date: string) => {
		if (isDirty.value && selectedNote.value) {
			pendingAction.value = () => doCreateNewNote(date)
			showUnsavedModal.value = true
			return
		}
		doCreateNewNote(date)
	}

	const loadNotes = async () => {
		try {
			const dates = await fetchNoteDates()
			noteDates.value = dates as NoteType[]
			if (!selectedNote.value && noteDates.value.length > 0) {
				const lastId = dbStateStore.lastViewedNoteId
				const lastNote = lastId ? noteDates.value.find((n: NoteType) => n.id === lastId) : null
				const noteToSelect = lastNote ?? [...noteDates.value].sort((a: NoteType, b: NoteType) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
				selectNote(noteToSelect)
			}
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		}
	}

	const saveNote = async (emit?: (event: string, data: unknown) => void) => {
		if (!selectedNote.value) return
		try {
			const noteContent = getContent().trim()
			const noteData = { date: selectedNote.value.date, content: noteContent, subtitle: noteSubtitle.value }
			if (noteContent) {
				const savedNote = selectedNote.value.id ? await updateNote(selectedNote.value.id, noteData) : await saveNoteToApi(noteData)
				if (savedNote) {
					const finalContent = await finalizeImages(savedNote.id!, noteContent)
					await cleanupOrphanImages(savedContent.value, finalContent)
					if (finalContent !== noteContent) {
						await updateNote(savedNote.id!, { content: finalContent })
						savedNote.content = finalContent
					}
					selectedNote.value = savedNote
					savedSubtitle.value = noteSubtitle.value
					// Toujours activer isLoadingNote après sauvegarde pour synchroniser
					// savedContent avec la version normalisée de Milkdown (le watch sync en continu).
					isLoadingNote.value = true
					if (finalContent !== noteContent) {
						savedContent.value = finalContent
						await setContent(finalContent)
					} else {
						savedContent.value = noteContent
					}
					setTimeout(() => {
						isLoadingNote.value = false
					}, 500)
					await loadNotes()
					toastSuccess(t('components.notes_panel.toast.save_success_title'), t('components.notes_panel.toast.save_success_desc'))
					emit?.('save', { date: savedNote.date, note: noteContent })
				}
			} else if (selectedNote.value.id) {
				await cleanupOrphanImages(savedContent.value, '')
				const success = await deleteNote(selectedNote.value.id)
				if (success) {
					selectedNote.value = null
					setContent('')
					await loadNotes()
					toastSuccess(t('components.notes_panel.toast.delete_success_title'), t('components.notes_panel.toast.delete_success_desc'))
					emit?.('save', { date: noteData.date, note: '' })
				}
			}
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		}
	}

	const onUnsavedDiscard = () => {
		showUnsavedModal.value = false
		const currentContent = getContent()
		if (currentContent.includes('tmp_nt_')) cleanupTmpImages()
		savedContent.value = currentContent
		if (pendingAction.value) {
			pendingAction.value()
			pendingAction.value = null
		}
	}

	const onUnsavedSaveAndContinue = async (emit?: (event: string, data: unknown) => void) => {
		await saveNote(emit)
		showUnsavedModal.value = false
		const action = pendingAction.value
		pendingAction.value = null
		if (action) action()
	}

	const confirmDeleteNote = (note: NoteType) => {
		noteToDelete.value = note
		showDeleteModal.value = true
	}

	const deleteNoteConfirmed = async () => {
		if (!noteToDelete.value || !noteToDelete.value.id) return
		try {
			loading.value = true
			if (noteToDelete.value.content) await deleteNoteImages(noteToDelete.value.content)
			const success = await deleteNote(noteToDelete.value.id)
			if (success) {
				if (selectedNote.value?.id === noteToDelete.value.id) {
					selectedNote.value = null
					dbStateStore.setLastViewedNoteId(null)
					setContent('')
				}
				await loadNotes()
				toastSuccess(t('components.notes_panel.toast.delete_success_title'), t('components.notes_panel.toast.delete_success_desc'))
			}
		} catch (err) {
			const { message } = catchTagMessage(err, t)
			log_error(message)
		} finally {
			loading.value = false
			showDeleteModal.value = false
			noteToDelete.value = null
		}
	}

	return {
		// state
		loading, noteDates, selectedNote, showDeleteModal, noteToDelete,
		showUnsavedModal, savedContent, pendingAction,
		showCreateModal, createNoteDate, createNoteTime, createNoteSubtitle,
		showChangeDateTimeModal, changeNoteDate, changeNoteTime,
		editorContent, noteSubtitle, savedSubtitle,
		uploadContext,
		// computed
		isDirty, isNewNote, showDirtyIndicator, selectedNoteId, noteDatesGrouped,
		// methods
		setContent, getContent, isMcpJournalNote,
		selectNote, doSelectNote,
		openCreateModal, doOpenCreateModal,
		openChangeDateTimeModal, confirmChangeDateTime,
		confirmCreateNote, createNewNote, doCreateNewNote,
		loadNotes, saveNote,
		onUnsavedDiscard, onUnsavedSaveAndContinue,
		confirmDeleteNote, deleteNoteConfirmed,
		cleanupTmpImages,
	}
}
