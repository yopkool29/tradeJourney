<template>
    <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('components.trade.table.show_detailed_note') }}</span>
        <UButtonGroup size="sm" orientation="horizontal">
            <UButton
                :color="dbStateStore.showDetailedNote ? 'primary' : 'neutral'"
                :variant="dbStateStore.showDetailedNote ? 'solid' : 'outline'"
                @click="dbStateStore.showDetailedNote = true"
                >{{ $t('common.yes') }}</UButton
            >
            <UButton
                :color="!dbStateStore.showDetailedNote ? 'primary' : 'neutral'"
                :variant="!dbStateStore.showDetailedNote ? 'solid' : 'outline'"
                @click="dbStateStore.showDetailedNote = false"
                >{{ $t('common.no') }}</UButton
            >
        </UButtonGroup>
    </div>
</template>

<script setup lang="ts">
const dbStateStore = useDbStateStore()
</script>
