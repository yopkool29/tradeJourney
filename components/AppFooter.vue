<template>
    <footer class="w-full py-8 bg-linear-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950 border-t border-gray-200 dark:border-gray-700">
        <div class="container mx-auto px-4 flex flex-col items-center gap-4">
            <!-- Copyright -->
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ $t('components.app_footer.copyright') }}
            </p>

            <!-- Social icons -->
            <div class="flex items-center gap-4">
                <a href="https://github.com/yopkool29/pnltracker" target="_blank" rel="noopener noreferrer"
                    class="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 transition-colors">
                    <UIcon name="i-lucide-github" class="w-6 h-6" />
                </a>
                <a :href="`https://doc.pnltracker.app/${locale}`" target="_blank" rel="noopener noreferrer"
                    class="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300 transition-colors">
                    <UIcon name="i-heroicons-book-open" class="w-6 h-6" />
                </a>
            </div>

            <!-- Legal links -->
            <div class="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                <NuxtLink to="/terms"
                    class="hover:text-primary dark:hover:text-primary-300 transition-colors">
                    {{ $t('components.app_footer.terms') }}
                </NuxtLink>
                <NuxtLink to="/privacy"
                    class="hover:text-primary dark:hover:text-primary-300 transition-colors">
                    {{ $t('components.app_footer.privacy') }}
                </NuxtLink>
            </div>
        </div>
    </footer>
</template>

<script setup lang="ts">
const { locale } = useI18n()
</script>
