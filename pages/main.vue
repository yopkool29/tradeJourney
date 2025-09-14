<template>
    <div class="container mx-auto px-4 py-8">
        <UTabs v-model="active" :items="items" class="w-full md:w-2xl" :ui="{ trigger: ['grow', 'cursor-pointer'] }" />
        <div class="mt-6">
            <KeepAlive :include="whitelistedViews">
                <component :is="items[items.findIndex((item) => item.value === active)].component" @imported="handleImported" />
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Import, Trade, Daily } from '#components'

const { t } = useI18n()

const userStore = useUserStore()

const whitelistedViews = ref<string[]>()

onMounted(async () => {
    userStore.setInvalidate(0)
})

onUnmounted(() => {})

async function clearCachedViews() {
    // First, set the value to an empty array to clear all current caches
    whitelistedViews.value = []

    // Wait for the next DOM update cycle to ensure the cache is cleared
    await nextTick()

    // Finally, reset whitelistedViews to undefined to allow all views to be cached again
    whitelistedViews.value = undefined
}

async function handleImported() {
    await clearCachedViews()
    active.value = 'trades'
    userStore.setInvalidate(0)
}

// Utiliser computed pour rendre les labels réactifs aux changements de langue
const items = computed(() => [
    {
        label: t('pages.trades.tabs.daily'),
        value: 'dailyhistory' as const,
        icon: 'i-lucide-calendar-days',
        component: markRaw(Daily),
    },
    {
        label: t('pages.trades.tabs.trades'),
        value: 'trades' as const,
        icon: 'i-lucide-receipt-text',
        component: markRaw(Trade),
    },
    {
        label: t('pages.trades.tabs.import'),
        value: 'import' as const,
        icon: 'i-lucide-import',
        component: markRaw(Import),
    },
])

const active = useState<string>(() => 'dailyhistory')
</script>
