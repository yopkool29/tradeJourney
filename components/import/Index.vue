<template>
    <div class="container mx-auto px-4 py-8">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold dark:text-white">{{ $t('components.import.index.title') }}</h1>
        </div>
        <div class="mb-6">
            <div class="text-gray-700 dark:text-gray-300">
                <p>{{ $t('components.import.index.intro') }}</p>
                <ul class="list-disc pl-5 mt-2 mb-2">
                    <li>{{ $t('components.import.index.format_mt5') }}</li>
                    <li>{{ $t('components.import.index.format_ninja') }}</li>
                </ul>
                <p class="italic">{{ $t('components.import.index.after_import') }}</p>
                <div class="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded mb-4">
                    <p class="font-semibold">{{ $t('components.import.index.warning_title') }}</p>
                    <p class="text-sm">{{ $t('components.import.index.warning_text') }}</p>
                    <p class="text-xs mt-1 italic">{{ $t('components.import.index.warning_note') }}</p>
                </div>
            </div>
        </div>
        <UCard>
            <UAlert v-if="errorStr" variant="outline" color="error" class="mb-8" :description="errorStr || ''" />
            <UAlert v-if="successStr" variant="outline" color="success" class="mb-8" :description="successStr || ''" />

            <UForm ref="refForm" class="space-y-5" :state="{}" @submit.prevent="onImport">
                <div class="flex flex-col gap-8">
                    <UFormField :label="$t('components.import.index.report_type')" required>
                        <USelect v-model="userStore.importOptions.reportType" :items="reportTypes" />
                    </UFormField>
                    <div class="flex gap-2">
                        <UFormField
                            :label="
                                userStore.importOptions.reportType === 'mt5'
                                    ? $t('components.import.index.file_mt5')
                                    : $t('components.import.index.file_ninja')
                            "
                            required
                        >
                            <UInput
                                :key="fileInputKey"
                                type="file"
                                :accept="
                                    userStore.importOptions.reportType === 'mt5'
                                        ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                                        : '.csv,text/csv'
                                "
                                @change="onFileChange"
                            />
                        </UFormField>
                        <UFormField :label="$t('components.import.index.timezone')" required>
                            <USelect v-model="timezoneModel" :items="timezonesItems" class="w-64" />
                        </UFormField>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <UButton type="submit" :disabled="!file">{{ $t('components.import.index.import_button') }}</UButton>
                    <UButton v-if="displayBack" @click="back()">{{ $t('components.import.index.back_button') }}</UButton>
                </div>
            </UForm>
        </UCard>
    </div>
</template>

<script setup lang="ts">
const refForm = ref()
const { log_error } = useLogView()
const userStore = useUserStore()
const { importTrades } = useTrades()
const { t } = useI18n()

const file = ref<File | null>(null)
const fileInputKey = ref(0) // Clé pour forcer le rendu du champ file

const reportTypes = [
    { value: 'mt5', label: 'MetaTrader 5 (XLSX)' },
    { value: 'nt8', label: 'NinjaTrader (CSV)' },
]

const errorStr = ref<string | null>('')
const successStr = ref<string | null>('')
const displayBack = ref(false)

const timezonesItems = [
    // UTC négatif (de -12 à -1)
    { value: 'Pacific/Kwajalein', label: 'UTC-12 (Baker Island)' },
    { value: 'Pacific/Samoa', label: 'UTC-11 (Samoa)' },
    { value: 'Pacific/Honolulu', label: 'UTC-10 (Hawaii)' },
    { value: 'America/Anchorage', label: 'UTC-9 (Alaska)' },
    { value: 'America/Los_Angeles', label: 'UTC-8 (Los Angeles)' },
    { value: 'America/Denver', label: 'UTC-7 (Denver)' },
    { value: 'America/Chicago', label: 'UTC-6 (Chicago)' },
    { value: 'America/New_York', label: 'UTC-5 (New York)' },
    { value: 'America/Caracas', label: 'UTC-4 (Caracas)' },
    { value: 'America/Sao_Paulo', label: 'UTC-3 (São Paulo)' },
    { value: 'America/Noronha', label: 'UTC-2 (Fernando de Noronha)' },
    { value: 'Atlantic/Azores', label: 'UTC-1 (Açores)' },
    
    // UTC (0)
    { value: 'UTC', label: 'UTC±0 (Temps Universel Coordonné)' },
    
    // UTC positif (de +1 à +14)
    { value: 'Europe/London', label: 'UTC+1 (Londres)' },
    { value: 'Europe/Paris', label: 'UTC+2 (Paris, Berlin)' },
    { value: 'Europe/Moscow', label: 'UTC+3 (Moscou)' },
    { value: 'Asia/Dubai', label: 'UTC+4 (Dubaï)' },
    { value: 'Asia/Karachi', label: 'UTC+5 (Karachi)' },
    { value: 'Asia/Dhaka', label: 'UTC+6 (Dhaka)' },
    { value: 'Asia/Bangkok', label: 'UTC+7 (Bangkok)' },
    { value: 'Asia/Shanghai', label: 'UTC+8 (Shanghai, Singapour)' },
    { value: 'Asia/Tokyo', label: 'UTC+9 (Tokyo)' },
    { value: 'Australia/Sydney', label: 'UTC+10 (Sydney)' },
    { value: 'Pacific/Noumea', label: 'UTC+11 (Nouméa)' },
    { value: 'Pacific/Auckland', label: 'UTC+12 (Auckland)' },
    { value: 'Pacific/Apia', label: 'UTC+13 (Apia)' },
    { value: 'Pacific/Kiritimati', label: 'UTC+14 (Kiritimati)' },
]

const timezoneModel = computed({
    get: () => userStore.importOptions.timezoneType[userStore.importOptions.reportType],
    set: (value: string) => {
        userStore.importOptions.timezoneType[userStore.importOptions.reportType] = value
        userStore.importOptions.timezone = value
    }
})

onActivated(() => {
    errorStr.value = null
    successStr.value = null
})

function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    file.value = target.files?.[0] || null
}

function resetForm() {
    // Réinitialiser les états
    errorStr.value = ''
    successStr.value = ''
    file.value = null

    // Incrémenter la clé pour forcer le rendu du champ file
    fileInputKey.value++

    // Réinitialiser le formulaire sans manipuler directement le DOM
    if (refForm.value) {
        refForm.value.clear()
    }
}

function back() {
    resetForm()
    emit('imported')
}

async function onImport() {
    // Réinitialiser les états
    errorStr.value = ''
    successStr.value = ''

    // Vérifier qu'un fichier est sélectionné
    if (!file.value) {
        errorStr.value = t('components.import.index.select_file')
        return
    }

    // Préparer les données du formulaire
    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('reportType', userStore.importOptions.reportType)
    formData.append('timezone', timezoneModel.value)

    // Démarrer le chargement
    userStore.isLoading = true

    try {
        // Appel API pour importer les trades
        const result = await importTrades(formData)

        // Afficher le message de succès
        successStr.value = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })

        // Afficher le bouton de retour
        displayBack.value = true
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
    } finally {
        // Arrêter le chargement dans tous les cas
        userStore.isLoading = false
    }
}

const emit = defineEmits<{
    imported: []
}>()
</script>
