<template>
	<!-- Custom titlebar pour Tauri desktop (Linux) -->
	<!-- Remplace la barre native XFWM4 pour permettre le snap gauche/droite -->
	<div v-if="isTauri" class="desktop-titlebar" data-tauri-drag-region>
		<div class="flex items-center gap-2 px-3 h-full" data-tauri-drag-region>
			<span class="text-sm font-medium text-muted select-none" data-tauri-drag-region>
				PnlTracker <span class="text-xs opacity-50">v0.1.0</span>
			</span>
		</div>
		<div class="flex items-center gap-0.5 pr-1">
			<!-- Snap left -->
			<button
				class="titlebar-btn"
				:title="$t('components.app_header.snap_left')"
				@click="snapLeft">
				<UIcon name="i-lucide-panel-left-dashed" class="w-3.5 h-3.5" />
			</button>
			<!-- Snap right -->
			<button
				class="titlebar-btn"
				:title="$t('components.app_header.snap_right')"
				@click="snapRight">
				<UIcon name="i-lucide-panel-right-dashed" class="w-3.5 h-3.5" />
			</button>
			<!-- Minimize -->
			<button
				class="titlebar-btn"
				:title="$t('components.app_header.minimize')"
				@click="minimize">
				<UIcon name="i-lucide-minus" class="w-3.5 h-3.5" />
			</button>
			<!-- Maximize / Restore -->
			<button
				class="titlebar-btn"
				:title="isMaximized ? $t('components.app_header.restore') : $t('components.app_header.maximize')"
				@click="toggleMaximize">
				<UIcon :name="isMaximized ? 'i-lucide-copy' : 'i-lucide-square'" class="w-3 h-3" />
			</button>
			<!-- Close -->
			<button
				class="titlebar-btn titlebar-btn-close"
				:title="$t('components.app_header.close')"
				@click="close">
				<UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
const { isTauri, snapLeft, snapRight, toggleMaximize, minimize, close } = useWindowSnap()

const isMaximized = ref(false)

// Synchroniser l'état maximisé
let unlisten: (() => void) | null = null

onMounted(async () => {
	if (!isTauri.value) return
	const { getCurrentWindow } = await import('@tauri-apps/api/window')
	const win = getCurrentWindow()
	isMaximized.value = await win.isMaximized()
	unlisten = await win.onResized(() => {
		win.isMaximized().then(v => isMaximized.value = v)
	})
})

onUnmounted(() => {
	if (unlisten) unlisten()
})
</script>

<style scoped>
.desktop-titlebar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 32px;
	background: var(--ui-bg-elevated);
	border-bottom: 1px solid var(--ui-border);
	-webkit-user-select: none;
	user-select: none;
	flex-shrink: 0;
}

.titlebar-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 4px;
	color: var(--ui-text-muted);
	transition: background-color 100ms ease, color 100ms ease;
}

.titlebar-btn:hover {
	background: var(--ui-bg-accented);
	color: var(--ui-text);
}

.titlebar-btn-close:hover {
	background: #e5484d;
	color: white;
}
</style>
