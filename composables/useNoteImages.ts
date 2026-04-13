const extractNtImages = (content: string): string[] => {
	const decoded = decodeURIComponent(content)
	const regex = /!\[[^\]]*\]\([^)]*\/(nt_[^)&\s]+)\)/g
	const results: string[] = []
	for (const match of decoded.matchAll(regex)) {
		results.push(match[1])
	}
	return results
}

export const useNoteImages = () => {
	const userStore = useUserStore()
	const { currentDatabase } = useDatabase()

	const uploadContext = computed(() => {
		const userId = userStore.user?.id
		const dbName = currentDatabase.value?.name
		if (!userId || !dbName) return undefined
		return { userId, dbName }
	})

	const cleanupOrphanImages = async (oldContent: string, newContent: string) => {
		if (!uploadContext.value) return
		const oldImages = extractNtImages(oldContent)
		const newImages = new Set(extractNtImages(newContent))
		const orphans = oldImages.filter(name => !newImages.has(name))
		for (const filename of orphans) {
			try {
				await $fetch(`/api/notes/images/${encodeURIComponent(filename)}`, { method: 'DELETE' })
			} catch {
				// ignore — file may already be deleted
			}
		}
	}

	const cleanupTmpImages = async () => {
		if (!uploadContext.value) return
		try {
			await $fetch('/api/notes/images/cleanup-tmp', { method: 'DELETE' })
		} catch {
			// ignore
		}
	}

	const finalizeImages = async (noteId: number, content: string): Promise<string> => {
		if (!uploadContext.value || !content.includes('tmp_nt_')) return content
		try {
			const result = await $fetch<{ content: string }>('/api/notes/images/finalize', {
				method: 'POST',
				body: { noteId, content },
			})
			return result.content
		} catch {
			return content
		}
	}

	return { uploadContext, cleanupOrphanImages, cleanupTmpImages, finalizeImages }
}
