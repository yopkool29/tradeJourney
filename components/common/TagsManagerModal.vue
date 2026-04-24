<template>
	<UModal :open="true" :title="$t('components.settings.tags.title')" :ui="{ content: 'max-w-3xl' }" @update:open="(val) => { if (!val) emit('close') }">
		<template #body>
			<SettingsTagsManager />
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton variant="soft" @click="emit('close')">{{ $t('common.actions.close') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
const emit = defineEmits<{
	close: []
}>()
</script>
