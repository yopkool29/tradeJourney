// Snap window controls pour Tauri desktop
// Permet de snap la fenêtre à gauche/droite/maximiser via l'API Tauri
// No-op en mode web (non-Tauri)

import { getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { PhysicalSize, PhysicalPosition } from '@tauri-apps/api/dpi'

export const useWindowSnap = () => {
	// isTauri doit être évalué côté client uniquement (pas en SSR)
	const isTauri = ref(false)

	onMounted(() => {
		const g = globalThis as Record<string, unknown>
		isTauri.value = g.isTauri === true || '__TAURI_INTERNALS__' in g
	})

	const snapLeft = async () => {
		if (!isTauri.value) return
		try {
			const win = getCurrentWindow()
			const monitor = await currentMonitor()
			if (!monitor) return
			const { width, height } = monitor.size
			const { x, y } = monitor.position
			if (await win.isMaximized()) {
				await win.unmaximize()
			}
			await win.setSize(new PhysicalSize(Math.floor(width / 2), height))
			await win.setPosition(new PhysicalPosition(x, y))
		} catch (err) {
			console.error('[snapLeft] error:', err)
		}
	}

	const snapRight = async () => {
		if (!isTauri.value) return
		try {
			const win = getCurrentWindow()
			const monitor = await currentMonitor()
			if (!monitor) return
			const { width, height } = monitor.size
			const { x, y } = monitor.position
			if (await win.isMaximized()) {
				await win.unmaximize()
			}
			await win.setSize(new PhysicalSize(Math.floor(width / 2), height))
			await win.setPosition(new PhysicalPosition(x + Math.floor(width / 2), y))
		} catch (err) {
			console.error('[snapRight] error:', err)
		}
	}

	const toggleMaximize = async () => {
		if (!isTauri.value) return
		const win = getCurrentWindow()
		await win.toggleMaximize()
	}

	const minimize = async () => {
		if (!isTauri.value) return
		const win = getCurrentWindow()
		await win.minimize()
	}

	const close = async () => {
		if (!isTauri.value) return
		const win = getCurrentWindow()
		await win.close()
	}

	return {
		isTauri,
		snapLeft,
		snapRight,
		toggleMaximize,
		minimize,
		close,
	}
}
