<template>
    <UPopover>
        <UButton icon="i-lucide-eye" size="sm" variant="ghost" color="neutral">
            {{ $t('components.dashboard.charts.visibility') }}
        </UButton>
        <template #content>
            <div class="p-2 space-y-2">
                <label v-for="chart in chartConfig" :key="chart.id" class="flex items-center gap-2 cursor-pointer">
                    <UCheckbox
                        :model-value="localVisibility[chart.id]"
                        @update:model-value="toggleChart(chart.id)"
                    />
                    <span>{{ t(chart.label) }}</span>
                </label>
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

watch(() => props.modelValue, (newVal) => {
    localVisibility.value = { ...newVal }
}, { deep: true })

const toggleChart = (chartId: string) => {
    localVisibility.value[chartId] = !localVisibility.value[chartId]
    // Petit délai pour laisser l'UI respirer avant l'initialisation Chart.js
    setTimeout(() => {
        emit('update:modelValue', { ...localVisibility.value })
    }, 50)
}
</script>
