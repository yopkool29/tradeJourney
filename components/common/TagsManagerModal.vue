<template>
	<CommonModalDefault :open="true" :title="$t('components.settings.tags.title')" :ui="{ overlay: 'z-[70]', content: 'max-w-3xl z-[70]' }" @closed="emit('close')">
		<template #content>
			<SettingsTagsManager />
		</template>
		<template #footer>
			<div class="action-buttons">
				<UButton variant="soft" @click="emit('close')">{{ $t('common.actions.close') }}</UButton>
			</div>
		</template>
	</CommonModalDefault>
</template>

<script setup lang="ts">
const emit = defineEmits<{
	close: []
}>()
</script>
