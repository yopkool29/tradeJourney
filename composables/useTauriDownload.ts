// Utilitaire de téléchargement de fichier compatible Tauri et web
// En Tauri : utilise le plugin dialog (save) + plugin fs (writeFile)
// En web : utilise le téléchargement natif du navigateur via <a download>

export const useTauriDownload = () => {
	const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

	// Télécharge un blob en demandant à l'utilisateur où sauvegarder (Tauri)
	// ou en déclenchant un téléchargement navigateur (web)
	const downloadBlob = async (blob: Blob, filename: string) => {
		if (isTauri) {
			const { save } = await import('@tauri-apps/plugin-dialog')
			const { writeFile } = await import('@tauri-apps/plugin-fs')
			const savePath = await save({
				defaultPath: filename,
			})
			if (!savePath) return
			const buffer = new Uint8Array(await blob.arrayBuffer())
			await writeFile(savePath, buffer)
			return
		}
		// Web : téléchargement classique
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		URL.revokeObjectURL(url)
	}

	// Télécharge du texte en tant que fichier
	const downloadText = async (text: string, filename: string, mime = 'text/plain') => {
		const blob = new Blob([text], { type: mime })
		await downloadBlob(blob, filename)
	}

	// Télécharge depuis une URL (fetch puis save)
	const downloadUrl = async (url: string, filename: string) => {
		if (isTauri) {
			const { save } = await import('@tauri-apps/plugin-dialog')
			const { writeFile } = await import('@tauri-apps/plugin-fs')
			const savePath = await save({
				defaultPath: filename,
			})
			if (!savePath) return
			const response = await fetch(url)
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			const blob = await response.blob()
			const buffer = new Uint8Array(await blob.arrayBuffer())
			await writeFile(savePath, buffer)
			return
		}
		// Web : téléchargement classique
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	return {
		isTauri,
		downloadBlob,
		downloadText,
		downloadUrl,
	}
}
