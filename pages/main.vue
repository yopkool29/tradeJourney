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
import { Import, Trade } from '#components'

const { t } = useI18n()

const whitelistedViews = ref<string[]>()

async function clearCachedViews() {
    whitelistedViews.value = []
    await nextTick()
    whitelistedViews.value = undefined
}

async function handleImported() {
    await clearCachedViews()
    active.value = 'trades'
}

const items = computed(() => [
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

const active = useState<string>('main-active-tab', () => 'trades')
</script>
