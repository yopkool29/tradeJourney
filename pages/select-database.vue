<template>
    <div class="min-h-screen flex justify-center px-4 pt-20 select-none">
        <div class="w-full max-w-2xl">
            <UCard class="bg-gray-100 dark:bg-gray-800">
                <template #header>
                    <div class="flex flex-col">
                        <h1 class="text-3xl font-bold mb-2 text-primary">
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
