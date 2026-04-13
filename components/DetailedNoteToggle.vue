<template>
    <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ $t('components.trade.table.show_detailed_note') }}</span>
        <UButtonGroup size="sm" orientation="horizontal">
            <UButton
                :color="userStore.showDetailedNote ? 'primary' : 'neutral'"
                :variant="userStore.showDetailedNote ? 'solid' : 'outline'"
                @click="userStore.showDetailedNote = true"
                >{{ $t('common.yes') }}</UButton
            >
            <UButton
                :color="!userStore.showDetailedNote ? 'primary' : 'neutral'"
                :variant="!userStore.showDetailedNote ? 'solid' : 'outline'"
                @click="userStore.showDetailedNote = false"
                >{{ $t('common.no') }}</UButton
            >
        </UButtonGroup>
    </div>
</template>

<script setup lang="ts">
const userStore = useUserStore()
</script>
