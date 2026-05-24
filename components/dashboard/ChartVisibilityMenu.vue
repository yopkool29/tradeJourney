<template>
    <UPopover>
        <UButton icon="i-lucide-eye" size="sm" variant="ghost" color="neutral">
            {{ $t('components.dashboard.charts.visibility') }}
        </UButton>
        <template #content>
            <div class="p-2 space-y-2">
                <div v-for="chart in chartConfig" :key="chart.id" class="flex items-center gap-2">
                    <UCheckbox
                        :model-value="localVisibility[chart.id]"
                        :disabled="isUpdating"
                        @update:model-value="toggleChart(chart.id)"
                    />
                    <span>{{ t(chart.label) }}</span>
                </div>
            </div>
        </template>
    </UPopover>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: Record<string, boolean>
}>()

const emit = defineEmits<{
    'update:modelValue': [value: Record<string, boolean>]
}>()

const { t } = useI18n()

const chartConfig = [
    { id: 'pnlBar', label: 'components.dashboard.charts.pnl_bar' },
    { id: 'cumulatedPnl', label: 'components.dashboard.charts.cumulated_pnl' },
    { id: 'appt', label: 'components.dashboard.charts.appt' },
    { id: 'winrate', label: 'components.dashboard.charts.winrate' },
]

const localVisibility = ref<Record<string, boolean>>({ ...props.modelValue })
const isUpdating = ref(false)
const debounceTimeout = ref<NodeJS.Timeout | null>(null)

watch(() => props.modelValue, (newVal) => {
    localVisibility.value = { ...newVal }
}, { deep: true })

const toggleChart = (chartId: string) => {
    localVisibility.value[chartId] = !localVisibility.value[chartId]
    isUpdating.value = true

    if (debounceTimeout.value) {
        clearTimeout(debounceTimeout.value)
    }

    debounceTimeout.value = setTimeout(() => {
        emit('update:modelValue', { ...localVisibility.value })
        isUpdating.value = false
    }, 500)
}
</script>
