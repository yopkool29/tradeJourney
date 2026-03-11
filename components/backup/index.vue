<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="header-layout">
                <span class="section-title">{{ $t('components.backup.title') }}</span>
            </div>
        </template>
        <div class="p-4">
            <p class="text-secondary mb-6">{{ $t('components.backup.description') }}</p>

            <div class="section-separator">
                <BackupManager @imported="emit('imported')" />
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
const emit = defineEmits(['imported'])
</script>
