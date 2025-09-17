<template>
    <footer class="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-4">
        <div class="container mx-auto text-center text-sm flex flex-col items-center justify-center gap-2">
            <div>© {{ new Date().getFullYear() }} TradeJourney — {{ $t('components.app_footer.copyright') }}</div>
            <div class="flex items-center justify-center gap-4 mt-2">
                <a 
                    href="https://github.com/yopkool29/tradeJourney" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                    title="GitHub"
                >
                    <img src="/img/social/github.svg" alt="GitHub" class="w-5 h-5 object-cover dark:invert" />
                    <span>GitHub</span>
                </a>
            </div>
        </div>
    </footer>
</template>
