<template>
    <div class="min-h-screen flex justify-center px-4 pt-20 dark:bg-gray-900 no-select">
        <div class="w-full max-w-2xl">
            <UCard class="shadow-lg dark:shadow-gray-800/30">
                <template #header>
                    <div class="flex flex-col">
                        <h1 class="text-3xl font-bold mb-2 text-primary-600 dark:text-primary-400">
                            {{ $t('pages.select_database.title') }}
                        </h1>
                        <p class="text-secondary">
                            {{ $t('pages.select_database.subtitle') }}
                        </p>
                    </div>
                </template>
                <DatabaseSelectList />
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
</script>
