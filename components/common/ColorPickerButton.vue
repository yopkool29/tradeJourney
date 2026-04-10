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
                    width: '2.5em',
                    height: '2.5em',
                    borderRadius: '50%',
                    border: '2px solid #ccc',
                    cursor: 'pointer',
                }"
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
            <div class="flex gap-2 justify-end">
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

const { t } = useI18n()
const userStore = useUserStore()
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
    if (hexColor && !userStore.recentColors2.includes(hexColor)) {
        userStore.recentColors2.unshift(hexColor)
        // Limiter à 10 couleurs récentes
        if (userStore.recentColors2.length > 10) {
            userStore.recentColors2.pop()
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
