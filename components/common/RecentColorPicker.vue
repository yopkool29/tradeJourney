<template>
    <div class="flex items-start gap-4">
        <UColorPicker v-model="modelValue" />
        <div class="flex flex-col gap-1">
            <span class="text-xs text-muted mb-1">Récents</span>
            <div class="flex flex-wrap gap-1">
                <button
                    v-for="color in recentColors"
                    :key="color"
                    tabindex="-1"
                    :style="{
                        backgroundColor: color,
                        width: '1.5em',
                        height: '1.5em',
                        borderRadius: '50%',
                        border: color === modelValue ? '2px solid #333' : '1px solid #ccc',
                        cursor: 'pointer',
                    }"
                    :title="color"
                    @click.prevent="selectColor(color)"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

const props = defineProps<{
    useAlternative?: boolean
}>()

const modelValue = defineModel<string | undefined>('modelValue')

const dbStateStore = useDbStateStore()

const recentColors = computed(() => {
    return props.useAlternative ? dbStateStore.recentColors2 : dbStateStore.recentColors
})

const selectColor = (color: string) => {
    modelValue.value = color
}
</script>
