<template>
    <div v-if="show" class="hidden md:flex border border-default rounded-lg p-2 bg-elevated">
        <UCalendar v-model="modelValue" :month="month" :month-controls="true" :year-controls="false"
            readonly size="lg" :ui="{ cellTrigger: 'calendar-cell-trigger', cell: 'w-9 h-7' }" @update:placeholder="onMonthChange">
            <template #day="{ day }">
                <div class="flex flex-col items-center justify-center w-full h-full rounded" :class="{
                    'calendar-cell-positive': dayStats[day.toString()]?.pnl > 0,
                    'calendar-cell-negative': dayStats[day.toString()]?.pnl < 0,
                }">
                    <span>{{ day.day }}</span>
                </div>
            </template>
        </UCalendar>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: unknown
    month: unknown
    dayStats: Record<string, { pnl: number }>
    show: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: unknown]
    'update:month': [value: unknown]
}>()

const modelValue = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const month = computed({
    get: () => props.month,
    set: (val) => emit('update:month', val)
})

const onMonthChange = (val: unknown) => {
    emit('update:month', val)
}
</script>
