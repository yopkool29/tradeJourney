const extractNtImages = (content: string): string[] => {
	const decoded = decodeURIComponent(content)
	const results = new Set<string>()

	// Match images with .../nt_xxx pattern (works for both /path/ and ?path=.../)
	const regex = /!\[[^\]]*\]\([^)]*\/(nt_[^)&\s]+)\)/g
	for (const match of decoded.matchAll(regex)) {
		results.add(match[1])
	}

	return Array.from(results)
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
			console.log('Deleting orphan image:', filename)
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

	const duplicateImages = async (content: string): Promise<string> => {
		if (!uploadContext.value) return content

		const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g
		const matches = [...content.matchAll(imageRegex)]

		let newContent = content
		for (const match of matches) {
			const fullMatch = match[0]
			const imageUrl = match[1]

			// Skip base64 images and external URLs
			if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
				continue
			}

			// Skip already-temporary images (they're already independent copies)
			if (imageUrl.includes('tmp_nt_')) {
				continue
			}

			// Only process local note images
			if (!imageUrl.includes('/api/image') && !imageUrl.includes('nt_')) {
				continue
			}

			try {
				// Fetch the image as blob
				const response = await fetch(imageUrl)
				if (!response.ok) continue

				const blob = await response.blob()
				const file = new File([blob], 'image.png', { type: blob.type })

				// Re-upload to get a new filename
				const formData = new FormData()
				formData.append('image', file)

				const result = await $fetch<{ url: string }>('/api/notes/images/upload', {
					method: 'POST',
					body: formData,
				})

				// Replace the old URL with the new one
				newContent = newContent.replace(fullMatch, fullMatch.replace(imageUrl, result.url))
			} catch (error) {
				console.warn('Failed to duplicate image:', imageUrl, error)
				// Continue with other images even if one fails
			}
		}

		return newContent
	}

	// Delete images from the server that are no longer referenced in the content
	const deleteNoteImages = async (content: string): Promise<void> => {
		if (!uploadContext.value) return
		const images = extractNtImages(content)
		for (const filename of images) {
			try {
				await $fetch(`/api/notes/images/${encodeURIComponent(filename)}`, { method: 'DELETE' })
			} catch {
				// ignore — file may already be deleted
			}
		}
	}

	return { uploadContext, cleanupOrphanImages, cleanupTmpImages, finalizeImages, duplicateImages, deleteNoteImages }
}
