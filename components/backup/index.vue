<template>
    <div class="container mx-auto px-4 py-8">
        <div class="flex items-center justify-between">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-2xl font-bold dark:text-white">{{ $t('components.backup.title') }}</h1>
            </div>
        </div>
        <div class="mb-6">
            <p class="text-gray-700 dark:text-gray-300">{{ $t('components.backup.description') }}</p>
        </div>

        <div class="space-y-6">
            <BackupManager @imported="emit('imported')" />
        </div>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['imported'])
</script>
