<template>
    <div class="container mx-auto px-4 py-8">
        <div class="mb-4">
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" @click="$router.back()">{{ $t('common.actions.back') }}</UButton>
        </div>
        <UTabs v-model="active" :items="items" class="w-full md:w-3xl" :ui="{ trigger: ['grow', 'cursor-pointer'] }" />
        <div class="mt-6">
            <KeepAlive :include="whitelistedViews">
                <component
                    :is="items[items.findIndex((item) => item.value === active)].component"
                    @imported="handleImported"
                />
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import { SettingsTradingSymbols, SettingsAccounts, SettingsTags, SettingsOptions, SettingsTools, Backup } from '#components'
import { markRaw } from 'vue'

const { t } = useI18n()
const active = useState<string>(() => 'accounts')

const whitelistedViews = ref<string[]>()

async function clearCachedViews() {
    // First, set the value to an empty array to clear all current caches
    whitelistedViews.value = []

    // Wait for the next DOM update cycle to ensure the cache is cleared
    await nextTick()

    // Finally, reset whitelistedViews to undefined to allow all views to be cached again
    whitelistedViews.value = undefined
}

// Utiliser computed pour rendre les labels réactifs aux changements de langue
const items = computed(() => [
    {
        label: t('pages.settings.tabs.accounts'),
        value: 'accounts' as const,
        icon: 'i-heroicons-user-group',
        component: markRaw(SettingsAccounts),
    },
    {
        label: t('pages.settings.tabs.tags'),
        value: 'tags' as const,
        icon: 'i-heroicons-tag',
        component: markRaw(SettingsTags),
    },
    {
        label: t('pages.settings.tabs.trading_symbols'),
        value: 'trading-symbols' as const,
        icon: 'i-heroicons-chart-bar',
        component: markRaw(SettingsTradingSymbols),
    },
    {
        label: t('pages.settings.tabs.backup'),
        value: 'backup' as const,
        icon: 'i-lucide-database-backup',
        component: markRaw(Backup),
    },
    {
        label: t('pages.settings.tabs.tools'),
        value: 'tools' as const,
        icon: 'i-lucide-wrench',
        component: markRaw(SettingsTools),
    },
    {
        label: t('pages.settings.tabs.options'),
        value: 'options' as const,
        icon: 'i-heroicons-cog',
        component: markRaw(SettingsOptions),
    },
])

async function handleImported() {
    await clearCachedViews()
}

</script>
