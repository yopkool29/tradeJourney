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
const props = defineProps<{
    label: string
    defaultColor?: string
}>()

const { t } = useI18n()
const userStore = useUserStore()
const modelValue = defineModel<string>()
const isOpen = ref(false)
const tempColor = ref<string>('')

function openPicker() {
    tempColor.value = modelValue.value || '#000000'
    isOpen.value = true
}

function saveColor() {
    modelValue.value = tempColor.value
    
    // Ajouter la couleur aux couleurs récentes (recentColors2)
    if (tempColor.value && !userStore.recentColors2.includes(tempColor.value)) {
        userStore.recentColors2.unshift(tempColor.value)
        // Limiter à 10 couleurs récentes
        if (userStore.recentColors2.length > 10) {
            userStore.recentColors2.pop()
        }
    }
    
    isOpen.value = false
}

function cancelColor() {
    isOpen.value = false
}

function resetColor() {
    if (props.defaultColor) {
        tempColor.value = props.defaultColor
        modelValue.value = props.defaultColor
        isOpen.value = false
    }
}
</script>
