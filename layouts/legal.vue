<template>
    <div class="h-screen flex flex-col overflow-y-auto">
        <header class="w-full py-4 border-b border-default">
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
