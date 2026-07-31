<template>
    <CommonModalDefault
        v-model:open="isOpen"
        :title="label"
    >
        <template #trigger>
            <button
                type="button"
                :style="{
                    backgroundColor: modelValue,
                    width: '3em',
                    height: '3em',
                    borderRadius: '50%',
                    border: '2px solid #e5e7eb',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }"
                class="hover:scale-105 hover:shadow-md"
                @click="openPicker"
            />
        </template>
        <template #content>
            <div class="p-4">
                <CommonRecentColorPicker v-model="tempColor" :use-alternative="true" />
                <div class="flex gap-2 mt-4">
                    <div class="text-md">{{ $t('components.settings.tags.result') }}:</div>
                    <UBadge :label="tempColor" :style="{ backgroundColor: tempColor, color: '#fff' }" />
                </div>
            </div>
        </template>
        <template #footer>
            <div class="action-buttons-end">
                <UButton @click="saveColor">{{ $t('common.actions.save') }}</UButton>
                <UButton variant="soft" @click="cancelColor">{{ $t('common.actions.cancel') }}</UButton>
                <UButton v-if="defaultColor" class="ml-4" variant="outline" @click="resetColor">{{ $t('common.actions.reset') }}</UButton>
            </div>
        </template>
    </CommonModalDefault>
</template>

<script setup lang="ts">
import { normalizeColorToHex } from '~/utils/color-utils'

const props = defineProps<{
    label: string
    defaultColor?: string
}>()

const dbStateStore = useDbStateStore()
const modelValue = defineModel<string>()
const isOpen = ref(false)
const tempColor = ref<string>('')

const openPicker = () => {
    tempColor.value = normalizeColorToHex(modelValue.value || '#000000')
    isOpen.value = true
}

const saveColor = () => {
    // Normalize to hex format before saving
    const hexColor = normalizeColorToHex(tempColor.value)
    modelValue.value = hexColor
    
    // Ajouter la couleur aux couleurs récentes (recentColors2)
    if (hexColor && !dbStateStore.recentColors2.includes(hexColor)) {
        dbStateStore.recentColors2.unshift(hexColor)
        // Limiter à 10 couleurs récentes
        if (dbStateStore.recentColors2.length > 10) {
            dbStateStore.recentColors2.pop()
        }
    }
    
    isOpen.value = false
}

const cancelColor = () => {
    isOpen.value = false
}

const resetColor = () => {
    if (props.defaultColor) {
        const hexColor = normalizeColorToHex(props.defaultColor)
        tempColor.value = hexColor
        modelValue.value = hexColor
        isOpen.value = false
    }
}
</script>
