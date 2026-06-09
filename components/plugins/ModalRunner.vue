<template>
	<CommonModalDefault v-if="activeModal" v-model:open="isOpen" :title="activeModal.title" :description="activeModal.description || `Modal: ${activeModal.title}`" @update:open="onClose">
		<template #content>
			<component :is="activeModal.component" v-if="activeModal.component" :sdk="sdk" />
			<p v-else>{{ activeModal.message }}</p>
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton :label="activeModal.closeLabel ?? $t('common.actions.close')" :color="activeModal.closeColor ?? 'primary'" :variant="activeModal.closeVariant ?? 'solid'" @click="onClose(false)" />
			</div>
		</template>
	</CommonModalDefault>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { TJPluginModalRegistered } from '~/type/plugin'

type PluginModal = Omit<TJPluginModalRegistered, 'component'> & { component?: Component }

const isOpen = ref(false)
const activeModal = ref<PluginModal | null>(null)
const sdk = typeof window !== 'undefined' ? (window as any).__TJ_SDK__ : undefined

const onClose = (val: boolean | undefined) => {
	if (!val && activeModal.value?.onClose) {
		activeModal.value.onClose()
	}
	isOpen.value = false
	activeModal.value = null
}

onMounted(() => {
	window.addEventListener('tj-plugin-open-modal', (e: Event) => {
		const { id } = (e as CustomEvent<{ id: string }>).detail
		const modal = window.__TJ_PLUGIN_MODALS__?.find(m => m.id === id)
		if (modal) {
			activeModal.value = { ...modal, component: modal.component as Component | undefined }
			isOpen.value = true
		}
	})
})
</script>
