<template>
    <div class="container mx-auto px-4 py-8">
        <UTabs v-model="active" :items="items" class="w-full sm:w-48" :ui="{ trigger: ['grow', 'cursor-pointer'] }" />
        <div class="mt-6">
            <KeepAlive :include="whitelistedViews">
                <component :is="items[items.findIndex((item) => item.value === active)].component" />
            </KeepAlive>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Dashboard } from '#components'

const { t } = useI18n()

const userStore = useUserStore()

const whitelistedViews = ref<string[]>()

onMounted(async () => {
    userStore.setInvalidate(0)
})

onUnmounted(() => {})

// Utiliser computed pour rendre les labels réactifs aux changements de langue
const items = computed(() => [
    {
        label: t('pages.dashboard.tabs.index'),
        value: 'home' as const,
        icon: 'i-lucide-chart-bar',
        component: markRaw(Dashboard),
    },
])

const active = useState<string>(() => 'home')
</script>
