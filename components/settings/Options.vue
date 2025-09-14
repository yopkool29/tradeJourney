<template>
    <UCard class="mb-8 md:max-w-6xl min-w-md">
        <template #header>
            <div class="flex flex-col justify-between items-start gap-4">
                <span class="font-bold text-lg">{{ $t('components.settings.options.title') }}</span>
            </div>
        </template>
        <div class="p-4">
            <p class="text-gray-600 dark:text-gray-400 mb-6">{{ $t('components.settings.options.description') }}</p>

            <UForm :state="formState" @submit="saveSettings">
                <div class="space-y-6">
                    <!-- Section Interface -->
                    <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h3 class="text-lg font-medium mb-4">{{ $t('components.settings.options.interface_section') }}</h3>
                        <div class="flex flex-col gap-8">
                            <UFormField name="noteNewline" class="w-128">
                                <UCheckbox
                                    v-model="formState.deleteConfirmationTrade"
                                    :label="$t('components.settings.options.delete_confirmation_trade')"
                                    :description="$t('components.settings.options.delete_confirmation_trade_desc')"
                                />
                            </UFormField>
                            <UFormField name="noteNewline" class="w-128">
                                <UCheckbox
                                    v-model="formState.deleteConfirmationNoteTags"
                                    :label="$t('components.settings.options.delete_confirmation_notes')"
                                    :description="$t('components.settings.options.delete_confirmation_notes_desc')"
                                />
                            </UFormField>
                            <UFormField name="showCalendarDaily" class="w-128">
                                <UCheckbox
                                    v-model="formState.showCalendarDaily"
                                    :label="$t('components.settings.options.show_calendar_daily')"
                                    :description="$t('components.settings.options.show_calendar_daily_desc')"
                                />
                            </UFormField>
                        </div>
                    </div>
                </div>
                <div class="flex justify-start mt-8 gap-2">
                    <UButton type="submit" color="primary">{{ $t('common.actions.save') }}</UButton>
                    <UButton type="button" color="neutral" @click="resetSettings">{{ $t('components.settings.options.reset_button') }}</UButton>
                </div>
            </UForm>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { SettingsContentType } from '~/schema/user'
import { defaultSettings } from '~/schema/user'

const toast = useToast()
const { updateSettings } = useAuth()
const userStore = useUserStore()
const { log_error } = useLogView()
const { t } = useI18n()

const emit = defineEmits(['settings-saved', 'settings-reset'])

const formState = ref<SettingsContentType>(defaultSettings)

onMounted(() => {
    const savedSettings = userStore.user!.settings_object
    if (savedSettings) {
        try {
            formState.value = savedSettings as SettingsContentType
        } catch {
            log_error(t('components.settings.options.error_loading'))
        }
    }
})

// Sauvegarder les paramètres
async function saveSettings() {
    try {
        const json = JSON.stringify(formState.value)

        userStore.user!.settings = json
        userStore.user!.settings_object = { ...formState.value }
        updateSettings(json)

        // Appliquer certains paramètres immédiatement
        applySettings()

        toast.add({
            title: t('components.settings.options.toast_saved_title'),
            description: t('components.settings.options.toast_saved_desc'),
            color: 'primary',
            duration: 2000,
        })
        
        // Émettre un événement pour informer le composant parent après un délai de 2 secondes
        setTimeout(() => {
            emit('settings-saved', { ...formState.value })
        }, 1000)
        
    } catch (error) {
        toast.add({
            title: t('components.settings.options.toast_error_title'),
            description: t('components.settings.options.toast_error_desc'),
            color: 'error',
            duration: 2000,
        })
        console.error('Erreur lors de la sauvegarde des paramètres:', error)
    }
}

// Réinitialiser les paramètres
function resetSettings() {
    // Créer un nouvel objet pour assurer la réactivité
    formState.value = { ...defaultSettings }

    const json = JSON.stringify(formState.value)
    userStore.user!.settings = json
    userStore.user!.settings_object = { ...formState.value }

    updateSettings(json)
    
    // Appliquer certains paramètres immédiatement
    applySettings()

    toast.add({
        title: t('components.settings.options.toast_reset_title'),
        description: t('components.settings.options.toast_reset_desc'),
        color: 'success',
        duration: 2000,
    })
    
    // Émettre un événement pour informer le composant parent après un délai de 2 secondes
    setTimeout(() => {
        emit('settings-reset', { ...formState.value })
    }, 1000)
}

function applySettings() {
    // Appliquer les paramètres qui nécessitent une action immédiate
    // Par exemple, mettre à jour des variables globales ou des préférences d'affichage
}
</script>
