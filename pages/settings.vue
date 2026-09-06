<template>
    <div class="container mx-auto px-4 py-8">
        <!-- Bouton Retour -->
        <div class="mb-4">
            <UButton :label="$t('common.actions.back')" icon="i-heroicons-arrow-left" color="primary" variant="link"
                @click="goBack" />
        </div>

        <UTabs v-model="active" :orientation="isMobile ? 'vertical' : 'horizontal'" :items="items"
            class="w-full md:w-4xl" :ui="{ list: 'items-start', trigger: ['cursor-pointer', 'justify-start', 'w-full'] }" />
        <div class="mt-6">
            <KeepAlive :include="whitelistedViews">
                <component :is="items[items.findIndex((item) => item.value === active)].component"
                    @imported="handleImported" />
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import { SettingsTradingSymbols, SettingsAccounts, SettingsTags, SettingsOptions, Backup, SettingsPlugins } from '#components'
import { markRaw } from 'vue'

const { t } = useI18n()
const config = useRuntimeConfig()
const { goBack } = useQuickNav()
const active = useState<string>('settingsActiveTab', () => 'accounts')

const whitelistedViews = ref<string[]>()

const windowWidth = ref(0)
const isMobile = computed(() => windowWidth.value < 1024)

onMounted(() => {
    windowWidth.value = window.innerWidth
    const handleResize = () => {
        windowWidth.value = window.innerWidth
    }
    window.addEventListener('resize', handleResize)
    onUnmounted(() => window.removeEventListener('resize', handleResize))
})

async function clearCachedViews() {
    // First, set the value to an empty array to clear all current caches
    whitelistedViews.value = []

    // Wait for the next DOM update cycle to ensure the cache is cleared
    await nextTick()

    // Finally, reset whitelistedViews to undefined to allow all views to be cached again
    whitelistedViews.value = undefined
}

// Utiliser computed pour rendre les labels réactifs aux changements de langue

const items = computed(() => {
    const baseItems: { label: string; value: 'accounts' | 'trading-symbols' | 'tags' | 'backup' | 'plugins' | 'options'; icon: string; component: ReturnType<typeof markRaw> }[] = [
        {
            label: t('pages.settings.tabs.accounts'),
            value: 'accounts' as const,
            icon: 'i-heroicons-user-group',
            component: markRaw(SettingsAccounts),
        },
        {
            label: t('pages.settings.tabs.trading_symbols'),
            value: 'trading-symbols' as const,
            icon: 'i-heroicons-chart-bar',
            component: markRaw(SettingsTradingSymbols),
        },
        {
            label: t('pages.settings.tabs.tags'),
            value: 'tags' as const,
            icon: 'i-heroicons-tag',
            component: markRaw(SettingsTags),
        },
        {
            label: t('pages.settings.tabs.backup'),
            value: 'backup' as const,
            icon: 'i-lucide-database-backup',
            component: markRaw(Backup),
        },
    ]

    if (config.public.pluginsEnabled) {
        baseItems.push({
            label: t('pages.settings.tabs.plugins'),
            value: 'plugins' as const,
            icon: 'i-heroicons-puzzle-piece',
            component: markRaw(SettingsPlugins),
        })
    }

    baseItems.push({
        label: t('pages.settings.tabs.options'),
        value: 'options' as const,
        icon: 'i-heroicons-cog',
        component: markRaw(SettingsOptions),
    })

    return baseItems
})

async function handleImported() {
    await clearCachedViews()
}

</script>
