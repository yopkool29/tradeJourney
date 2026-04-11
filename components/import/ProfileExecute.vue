<template>
    <div>
        <div class="flex items-center gap-3 mb-6">
            <UButton variant="ghost" icon="i-lucide-arrow-left" size="xs" @click="emit('back')" />
            <div class="flex items-center gap-2">
                <UIcon :name="getProviderIconWithMetadata(profile.provider, profile.metadata)"
                    class="w-5 h-5 text-primary-500" />
                <h2 class="text-lg font-semibold">{{ profile.name }}</h2>
                <UBadge variant="subtle" size="xs">{{ getProviderLabel(profile.provider) }}</UBadge>
            </div>
        </div>

        <UCard>
            <CommonAlertBox :success-str="successStr" :error-str="errorStr" />

            <div class="space-y-6">
                <!-- Résumé du profil -->
                <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex flex-col gap-4 text-sm">
                        <div>
                            <span class="text-secondary">{{ $t('components.import.profiles.timezone') }}:</span>
                            <span class="ml-2 font-medium">
                                {{ profile.importMode === 'utc' ? `UTC${Number(profile.timezone) >= 0 ? '+' :
                                    ''}${profile.timezone}` : profile.timezone }}
                            </span>
                        </div>
                        <div>
                            <span class="text-secondary">{{ $t('components.import.profiles.keep_existing') }}:</span>
                            <span class="ml-2 font-medium">{{ profile.keepExistingTrades ? $t('common.yes') :
                                $t('common.no') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Sélection de fichier (pour les imports fichier) -->
                <div v-if="!isApiImport && !useCloudStorage" class="flex gap-2">
                    <UFormField :label="getFileLabel" required class="w-full">
                        <UInput :key="fileInputKey" type="file"
                            :accept="profile.provider === 'mt5' ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'"
                            @change="onFileChange" />
                    </UFormField>
                </div>
                <!-- Info API pour les imports live -->
                <div v-if="isApiImport"
                    class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 rounded">
                    <p class="text-sm font-semibold">{{ $t('components.import.profile_execute.api_info') }}</p>
                    <p v-if="profile.provider === 'ibkr-api'" class="text-xs mt-1">
                        {{ $t('components.import.profile_execute.ibkr_api_desc') }}
                    </p>
                    <div v-if="useCloudStorage" class="text-xs mt-1 space-y-1">
                        <p>{{ $t('components.import.profile_execute.storage_info') }}</p>
                        <p>{{ $t('components.import.profile_execute.storage_desc') }}</p>
                    </div>
                </div>

                <!-- Liste des fichiers disponibles (pour cloud storage) -->
                <div v-if="useCloudStorage" class="space-y-4">
                    <UButton :loading="isLoadingFiles" variant="soft" icon="i-lucide-refresh-cw"
                        @click="loadStorageFiles">
                        {{ $t('components.import.profile_execute.refresh_files') }}
                    </UButton>
                    <div v-if="storageFiles.length > 0" class="space-y-2">
                        <div v-for="file in storageFiles" :key="file.file_id"
                            class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                            :class="{ 'border-primary-500 bg-primary-50 dark:bg-primary-900/20': selectedFileId === file.file_id }"
                            @click="selectedFileId = file.file_id">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-medium"><span>{{ file.source ? file.source + '-' : ''
                                            }}</span><span>{{ file.filename }}</span></p>
                                    <p class="text-xs text-secondary">{{ new Date(file.timestamp).toLocaleString() }} •
                                        {{ (file.file_size / 1024).toFixed(2) }} KB</p>
                                </div>
                                <UBadge v-if="file.retrieved" color="neutral" variant="subtle">{{
                                    $t('components.import.profile_execute.already_retrieved') }}</UBadge>
                            </div>
                        </div>
                    </div>
                    <div v-else-if="!isLoadingFiles" class="text-center text-secondary py-4">
                        {{ $t('components.import.profile_execute.no_files') }}
                    </div>
                </div>

                <!-- Boutons d'action -->
                <div class="flex gap-2 pt-4">
                    <UButton
                        :disabled="(useCloudStorage && !selectedFileId) || (!isApiImport && !useCloudStorage && !file)"
                        :loading="isLoading" @click="onImport">
                        {{ $t('components.import.index.import_button') }}
                    </UButton>
                    <UButton variant="soft" @click="emit('back')">
                        {{ $t('components.import.index.back_button') }}
                    </UButton>
                </div>
            </div>
        </UCard>
    </div>
</template>

<script setup lang="ts">
import type { ImportProfileType } from '~/schema/importProfile'
import { getProviderIconWithMetadata, getProviderLabel } from '~/utils/import_utils'

const { t } = useI18n()
const userStore = useUserStore()
const { log_error, log_info } = useLogView()
const { importTrades } = useTrades()
const { listFiles, retrieveFile, deleteFile } = useStorageServer()
const { errorStr, successStr, displayMessage } = useAlert()

const props = defineProps<{
    profile: ImportProfileType
}>()

const emit = defineEmits<{
    back: []
    imported: []
}>()

const file = ref<File | null>(null)
const fileInputKey = ref(0)

const isLoading = ref(false)
const isLoadingFiles = ref(false)
const storageFiles = ref<any[]>([])
const selectedFileId = ref<string | null>(null)

const useCloudStorage = computed(() => {
    const value = props.profile.metadata?.useCloudStorage || false
    console.log('🔍 useCloudStorage:', value, 'metadata:', props.profile.metadata)
    return value
})
const isApiImport = computed(() => props.profile.provider === 'ibkr-api' || useCloudStorage.value)

// IBKR Flex Query composable avec token/queryId du profil
const ibkrToken = computed(() => props.profile.ibkrFlexQueryToken || '')
const ibkrQueryId = computed(() => props.profile.ibkrFlexQueryId || '')
const { executeFlexQuery, isConfigured: isIBKRConfigured } = useIBKRFlexQuery(ibkrToken, ibkrQueryId)

const getFileLabel = computed(() => {
    switch (props.profile.provider) {
        case 'mt5': return t('components.import.index.file_mt5')
        case 'quantower': return t('components.import.index.file_quantower')
        case 'ibkr': return t('components.import.index.file_ibkr')
        case 'standard': return t('components.import.index.file_standard')
        case 'nt8':
        default: return t('components.import.index.file_ninja')
    }
})

async function loadStorageFiles() {
    isLoadingFiles.value = true
    try {
        storageFiles.value = await listFiles()
    } catch (err) {
        log_error('Failed to load storage files')
    } finally {
        isLoadingFiles.value = false
    }
}

// Auto-load files for cloud storage on mount
onMounted(() => {
    if (useCloudStorage.value) {
        loadStorageFiles()
    }
})

function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    file.value = target.files?.[0] || null
}

async function onImport() {
    displayMessage(null, null)

    if (props.profile.provider === 'ibkr-api') {
        await importFromIBKRFlexQuery()
        return
    }

    if (useCloudStorage.value) {
        await importFromStorageServer()
        return
    }

    if (!file.value) {
        displayMessage(null, t('components.import.index.select_file'))
        return
    }

    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('reportType', props.profile.provider)
    formData.append('importMode', props.profile.importMode)
    formData.append('timezone', props.profile.timezone)
    formData.append('keepExistingTrades', String(props.profile.keepExistingTrades))
    formData.append('instrumentType', props.profile.instrumentType || 'any')
    formData.append('dayTagIds', JSON.stringify(props.profile.dayTags))
    formData.append('tradeTagIds', JSON.stringify(props.profile.tradeTags))

    // log_info('importFromProfile importMode:', props.profile.importMode)
    // log_info('importFromProfile timezone:', props.profile.timezone)

    isLoading.value = true
    const { startLoading, stopLoading } = useGlobalLoading()
    startLoading()

    try {
        const result = await importTrades(formData)
        const msg = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
        displayMessage(msg, null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
    } finally {
        isLoading.value = false
        stopLoading()
    }
}

async function importFromNinjaTraderApi() {
    isLoading.value = true
    const { startLoading, stopLoading } = useGlobalLoading()
    startLoading()

    try {
        const { fetchTrades } = useNinjaTraderApi()
        const daysToImport = userStore.user?.settings_object?.ninjaTraderApiDays || 1
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - daysToImport)
        const formattedStartDate = startDate.toISOString().split('T')[0]

        const csvData = await fetchTrades({ startDate: formattedStartDate })

        const blob = new Blob([csvData], { type: 'text/csv' })
        const csvFile = new File([blob], 'ninjatrader-api-export.csv', { type: 'text/csv' })

        const formData = new FormData()
        formData.append('file', csvFile)
        formData.append('reportType', 'nt8')
        formData.append('importMode', props.profile.importMode)
        formData.append('timezone', props.profile.timezone)
        formData.append('keepExistingTrades', String(props.profile.keepExistingTrades))
        formData.append('instrumentType', props.profile.instrumentType || 'any')
        formData.append('dayTagIds', JSON.stringify(props.profile.dayTags))
        formData.append('tradeTagIds', JSON.stringify(props.profile.tradeTags))

        // log_info('importFromNinjaTraderApi importMode:', props.profile.importMode)
        // log_info('importFromNinjaTraderApi timezone:', props.profile.timezone)

        const result = await importTrades(formData)
        const msg = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
        displayMessage(msg, null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        const errorMsg = message || t('components.import.index.api_import_error')
        displayMessage(null, errorMsg)
    } finally {
        isLoading.value = false
        stopLoading()
    }
}

async function importFromIBKRFlexQuery() {
    isLoading.value = true
    const { startLoading, stopLoading } = useGlobalLoading()
    startLoading()

    try {
        if (!isIBKRConfigured.value) {
            throw new Error('IBKR Flex Query token and query ID must be configured in the import profile.')
        }

        // Utiliser le composable pour exécuter la Flex Query
        const csvData = await executeFlexQuery()

        const blob = new Blob([csvData], { type: 'text/csv' })
        const csvFile = new File([blob], 'ibkr-flexquery-export.csv', { type: 'text/csv' })

        const formData = new FormData()
        formData.append('file', csvFile)
        formData.append('reportType', 'ibkr')
        formData.append('importMode', props.profile.importMode)
        formData.append('timezone', props.profile.timezone)
        formData.append('keepExistingTrades', String(props.profile.keepExistingTrades))
        formData.append('instrumentType', props.profile.instrumentType || 'any')
        formData.append('dayTagIds', JSON.stringify(props.profile.dayTags))
        formData.append('tradeTagIds', JSON.stringify(props.profile.tradeTags))

        // log_info('importFromIBKRFlexQuery importMode:', props.profile.importMode)
        // log_info('importFromIBKRFlexQuery timezone:', props.profile.timezone)

        const result = await importTrades(formData)
        const msg = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
        displayMessage(msg, null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        const errorMsg = message || t('components.import.index.api_import_error')
        displayMessage(null, errorMsg)
    } finally {
        isLoading.value = false
        stopLoading()
    }
}

async function importFromStorageServer() {
    if (!selectedFileId.value) {
        displayMessage(null, t('components.import.profile_execute.select_file_from_storage'))
        return
    }

    isLoading.value = true
    const { startLoading, stopLoading } = useGlobalLoading()
    startLoading()

    try {
        // Récupérer le fichier chiffré du serveur
        const encryptedData = await retrieveFile(selectedFileId.value)
        if (!encryptedData) {
            throw new Error('Failed to retrieve file from storage server')
        }

        // Créer un Blob et un File à partir des données chiffrées
        const blob = new Blob([encryptedData], { type: 'text/csv' })
        const csvFile = new File([blob], 'storage-server-export.csv', { type: 'text/csv' })

        const formData = new FormData()
        formData.append('file', csvFile)
        formData.append('reportType', props.profile.provider)
        formData.append('importMode', props.profile.importMode)
        formData.append('timezone', props.profile.timezone)
        formData.append('keepExistingTrades', String(props.profile.keepExistingTrades))
        formData.append('instrumentType', props.profile.instrumentType || 'any')
        formData.append('dayTagIds', JSON.stringify(props.profile.dayTags))
        formData.append('tradeTagIds', JSON.stringify(props.profile.tradeTags))

        // log_info('importFromStorageServer importMode:', props.profile.importMode)
        // log_info('importFromStorageServer timezone:', props.profile.timezone)

        const result = await importTrades(formData)
        const msg = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
        displayMessage(msg, null)

        // Optionnel: supprimer le fichier du serveur après import réussi
        // await deleteFile(selectedFileId.value)

        // Recharger la liste des fichiers
        await loadStorageFiles()
        selectedFileId.value = null
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        const errorMsg = message || t('components.import.index.api_import_error')
        displayMessage(null, errorMsg)
    } finally {
        isLoading.value = false
        stopLoading()
    }
}
</script>
