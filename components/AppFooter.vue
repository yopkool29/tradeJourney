<template>
    <footer class="w-full py-8 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div class="container mx-auto px-4">
            <div class="flex flex-col md:flex-row items-start justify-between gap-8">
                <!-- Left: Logo + Navigation -->
                <div class="flex flex-col md:flex-row items-start gap-8">
                    <!-- Logo + Copyright -->
                    <div class="flex flex-col items-start gap-2">
                        <AppLogo :width="120" :height="36" />
                        <span class="text-xs text-gray-500 dark:text-gray-400">© {{ new Date().getFullYear() }}</span>
                    </div>

                    <!-- Navigation links in column -->
                    <nav v-if="userStore.user" class="flex flex-col gap-2 text-sm">
                        <NuxtLink 
                            v-for="(item, index) in footerMenuItems" 
                            :key="index"
                            :to="item.to"
                            class="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 transition-colors"
                        >
                            {{ item.label }}
                        </NuxtLink>
                    </nav>
                </div>

                <!-- Right: GitHub -->
                <div>
                    <a 
                        href="https://github.com/yopkool29/tradeJourney" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        title="GitHub Repository"
                    >
                        <UIcon name="i-lucide-github" class="w-5 h-5" />
                        <span class="text-sm font-medium">GitHub</span>
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
const { t } = useI18n()
const userStore = useUserStore()

const footerMenuItems = computed(() => [
    { to: '/dashboard', label: t('components.app_header.menu_items.dashboard') },
    { to: '/calendar', label: t('pages.trades.tabs.calendar') },
    { to: '/daily', label: t('pages.trades.tabs.daily') },
    { to: '/main', label: t('pages.trades.tabs.trades') },
])
</script>
