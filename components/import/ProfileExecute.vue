<template>
    <div>
        <div class="flex items-center gap-3 mb-6">
            <UButton variant="ghost" icon="i-lucide-arrow-left" size="xs" @click="emit('back')" />
            <div class="flex items-center gap-2">
                <UIcon :name="getProviderIcon(profile.provider)" class="w-5 h-5 text-primary-500" />
                <h2 class="text-lg font-semibold">{{ profile.name }}</h2>
                <UBadge variant="subtle" size="xs">{{ getProviderLabel(profile.provider) }}</UBadge>
            </div>
        </div>

        <UCard>
            <UAlert v-if="errorStr" variant="outline" color="error" class="mb-4" :description="errorStr" />
            <UAlert v-if="successStr" variant="outline" color="success" class="mb-4" :description="successStr" />

            <div class="space-y-6">
                <!-- Résumé du profil -->
                <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div class="flex flex-col gap-4 text-sm">
                        <div>
                            <span class="text-secondary">{{ $t('components.import.profiles.timezone') }}:</span>
                            <span class="ml-2 font-medium">
                                {{ profile.importMode === 'utc' ? `UTC${Number(profile.timezone) >= 0 ? '+' : ''}${profile.timezone}` : profile.timezone }}
                            </span>
                        </div>
                        <div>
                            <span class="text-secondary">{{ $t('components.import.profiles.keep_existing') }}:</span>
                            <span class="ml-2 font-medium">{{ profile.keepExistingTrades ? $t('common.yes') : $t('common.no') }}</span>
                        </div>
                    </div>
                </div>

                <!-- Sélection de fichier (pour les imports fichier) -->
                <div v-if="!isApiImport" class="flex gap-2">
                    <UFormField
                        :label="getFileLabel"
                        required
                        class="w-full"
                    >
                        <UInput
                            :key="fileInputKey"
                            type="file"
                            :accept="profile.provider === 'mt5' ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'"
                            @change="onFileChange"
                        />
                    </UFormField>
                </div>

                <!-- Info API pour les imports live -->
                <div v-if="isApiImport" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 rounded">
                    <p class="text-sm font-semibold">{{ $t('components.import.profile_execute.api_info') }}</p>
                    <p v-if="profile.provider === 'ibkr-api'" class="text-xs mt-1">
                        {{ $t('components.import.profile_execute.ibkr_api_desc') }}
                    </p>
                    <p v-if="profile.provider === 'nt8-api'" class="text-xs mt-1">
                        {{ $t('components.import.profile_execute.nt8_api_desc') }}
                    </p>
                </div>

                <!-- Boutons d'action -->
                <div class="flex gap-2 pt-4">
                    <UButton
                        :disabled="!isApiImport && !file"
                        :loading="isLoading"
                        @click="onImport"
                    >
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

const { t } = useI18n()
const userStore = useUserStore()
const { log_error, log_info } = useLogView()
const { importTrades } = useTrades()

const props = defineProps<{
    profile: ImportProfileType
}>()

const emit = defineEmits<{
    back: []
    imported: []
}>()

const file = ref<File | null>(null)
const fileInputKey = ref(0)
const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)
const isLoading = ref(false)

const isApiImport = computed(() => props.profile.provider === 'nt8-api' || props.profile.provider === 'ibkr-api')

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

function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement
    file.value = target.files?.[0] || null
}

async function onImport() {
    errorStr.value = null
    successStr.value = null

    if (props.profile.provider === 'nt8-api') {
        await importFromNinjaTraderApi()
        return
    }

    if (props.profile.provider === 'ibkr-api') {
        await importFromIBKRFlexQuery()
        return
    }

    if (!file.value) {
        errorStr.value = t('components.import.index.select_file')
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

    log_info('importFromProfile importMode:', props.profile.importMode)
    log_info('importFromProfile timezone:', props.profile.timezone)

    isLoading.value = true
    const { startLoading, stopLoading } = useGlobalLoading()
    startLoading()

    try {
        const result = await importTrades(formData)
        successStr.value = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
        log_error(message)
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

        log_info('importFromNinjaTraderApi importMode:', props.profile.importMode)
        log_info('importFromNinjaTraderApi timezone:', props.profile.timezone)

        const result = await importTrades(formData)
        successStr.value = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message || t('components.import.index.api_import_error')
        log_error(message)
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

        log_info('importFromIBKRFlexQuery importMode:', props.profile.importMode)
        log_info('importFromIBKRFlexQuery timezone:', props.profile.timezone)

        const result = await importTrades(formData)
        successStr.value = t('components.import.index.import_success', { updated: result.countUpdated, ignored: result.countDiscard })
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message || t('components.import.index.api_import_error')
        log_error(message)
    } finally {
        isLoading.value = false
        stopLoading()
    }
}
</script>
