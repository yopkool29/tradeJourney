<template>
	<!-- Bordures de redimensionnement pour Tauri desktop (decorations: false) -->
	<div v-if="isTauri" class="resize-borders">
		<div class="resize-edge resize-top" @mousedown="startResize('North')" />
		<div class="resize-edge resize-bottom" @mousedown="startResize('South')" />
		<div class="resize-edge resize-left" @mousedown="startResize('West')" />
		<div class="resize-edge resize-right" @mousedown="startResize('East')" />
		<div class="resize-corner resize-tl" @mousedown="startResize('NorthWest')" />
		<div class="resize-corner resize-tr" @mousedown="startResize('NorthEast')" />
		<div class="resize-corner resize-bl" @mousedown="startResize('SouthWest')" />
		<div class="resize-corner resize-br" @mousedown="startResize('SouthEast')" />
	</div>
</template>

<script setup lang="ts">
const { isTauri } = useWindowSnap()

const startResize = async (direction: 'East' | 'North' | 'NorthEast' | 'NorthWest' | 'South' | 'SouthEast' | 'SouthWest' | 'West') => {
	if (!isTauri.value) return
	const { getCurrentWindow } = await import('@tauri-apps/api/window')
	const win = getCurrentWindow()
	await win.startResizeDragging(direction)
}
</script>

<style scoped>
.resize-borders {
	position: fixed;
	inset: 0;
	pointer-events: none;
	z-index: 1;
}

.resize-edge {
	pointer-events: auto;
	position: absolute;
	background: transparent;
}

.resize-top {
	top: 0;
	left: 6px;
	right: 6px;
	height: 4px;
	cursor: ns-resize;
}

.resize-bottom {
	bottom: 0;
	left: 6px;
	right: 6px;
	height: 4px;
	cursor: ns-resize;
}

.resize-left {
	left: 0;
	top: 6px;
	bottom: 6px;
	width: 4px;
	cursor: ew-resize;
}

.resize-right {
	right: 0;
	top: 6px;
	bottom: 6px;
	width: 4px;
	cursor: ew-resize;
}

.resize-corner {
	pointer-events: auto;
	position: absolute;
	width: 10px;
	height: 10px;
	background: transparent;
}

.resize-tl {
	top: 0;
	left: 0;
	cursor: nwse-resize;
}

.resize-tr {
	top: 0;
	right: 0;
	cursor: nesw-resize;
}

.resize-bl {
	bottom: 0;
	left: 0;
	cursor: nesw-resize;
}

.resize-br {
	bottom: 0;
	right: 0;
	cursor: nwse-resize;
}
</style>
