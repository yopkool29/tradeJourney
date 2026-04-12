<template>
	<div v-if="slots.length" class="flex items-center gap-2">
		<UButton
			v-for="slot in slots"
			:key="slot.id"
			:icon="slot.icon || 'i-heroicons-puzzle-piece'"
			:label="slot.label"
			color="neutral"
			variant="soft"
			size="sm"
			@click="slot.onClick"
		/>
	</div>
</template>

<script setup lang="ts">
import type { TJPluginPageSlotRegistered } from '~/type/plugin'

const props = defineProps<{
	slotId: string
}>()

const pluginPageSlots = useState<TJPluginPageSlotRegistered[]>('pluginPageSlots', () => [])

const slots = computed(() => pluginPageSlots.value.filter(s => s.slotId === props.slotId))
</script>
