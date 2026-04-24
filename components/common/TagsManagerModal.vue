<template>
	<UModal v-model:open="open" :title="$t('components.settings.tags.title')" :overlay="false" :ui="{ content: 'max-w-3xl z-[600]' }" :portal="true">
		<template #body>
			<SettingsTagsManager @tags-updated="emit('tags-updated')" />
		</template>
		<template #footer>
			<div class="flex justify-end">
				<UButton variant="soft" @click="open = false">{{ $t('common.actions.close') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ 'tags-updated': [] }>()
</script>
