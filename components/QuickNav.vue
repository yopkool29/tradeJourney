<template>
    <div v-if="shortcuts.length > 0" class="container mx-auto px-4 py-1.5 flex items-center gap-2 flex-wrap lg:flex-nowrap lg:overflow-x-auto">
        <UIcon name="i-lucide-zap" class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <button
            v-for="item in shortcuts"
            :key="item.path"
            :class="[
                'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md',
                'transition-all duration-150 ease-out whitespace-nowrap flex-shrink-0 cursor-pointer',
                item.path === route.path
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-700',
            ]"
            @click="navigateToShortcut(item)"
        >
            <UIcon :name="item.icon" class="w-3.5 h-3.5" />
            <span>{{ item.label }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { shortcuts, navigateToShortcut } = useQuickNav()
</script>
