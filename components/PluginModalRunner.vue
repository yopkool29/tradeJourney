<template>
	<CommonModalDefault v-if="activeModal" v-model:open="isOpen" :title="activeModal.title" @update:open="onClose">
		<template #content>
			<p>{{ activeModal.message }}</p>
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton :label="$t('common.actions.close')" color="neutral" variant="ghost" @click="onClose(false)" />
			</div>
		</template>
	</CommonModalDefault>
</template>

<script setup lang="ts">
import type { TJPluginModalRegistered } from '~/type/plugin'

const isOpen = ref(false)
const activeModal = ref<TJPluginModalRegistered | null>(null)

const onClose = (val: boolean) => {
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
			activeModal.value = modal
			isOpen.value = true
		}
	})
})
</script>
