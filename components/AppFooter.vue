<template>
    <footer class="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 py-8 mt-12">
        <div class="container mx-auto px-4">
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
                <!-- Left: Branding -->
                <div class="flex flex-col items-center md:items-start gap-1">
                    <div class="font-semibold text-gray-900 dark:text-white">TradeJourney</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ $t('components.app_footer.copyright') }}</div>
                </div>

                <!-- Center: Links -->
                <div class="flex items-center justify-center gap-6">
                    <a 
                        href="https://github.com/yopkool29/tradeJourney" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
                        title="GitHub Repository"
                    >
                        <UIcon name="i-lucide-github" class="w-5 h-5" />
                        <span class="text-sm font-medium">GitHub</span>
                    </a>
                </div>

                <!-- Right: Year -->
                <div class="text-xs text-gray-500 dark:text-gray-400">
                    © {{ new Date().getFullYear() }}
                </div>
            </div>
        </div>
    </footer>
</template>
