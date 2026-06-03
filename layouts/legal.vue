<template>
    <div class="min-h-screen flex flex-col">
        <header class="w-full py-4 border-b border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4">
                <NuxtLink to="/">
                   <AppLogo :width="150" />
                </NuxtLink>
            </div>
        </header>

        <main class="flex-1">
            <slot />
        </main>

        <AppFooter />
    </div>
</template>

<script setup lang="ts">
</script>
