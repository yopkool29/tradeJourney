<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="header-layout">
                <span class="section-title">{{ $t('components.settings.tools.title') }}</span>
            </div>
        </template>
        <div class="p-4">
            <p class="text-secondary mb-6">{{ $t('components.settings.tools.description') }}</p>

            <div class="section-separator">
                <h3 class="section-subtitle-lg">{{ $t('components.settings.tools.csv_converter.title') }}</h3>

                <UForm id="converterForm" :state="converterParams" :schema="converterParamsSchema"
                    class="space-y-4" @submit="onSubmitConvert">
                    <!-- Conversion Type Selection -->
                    <UFormField :label="$t('components.settings.tools.csv_converter.conversion_type')"
                        name="conversionType">
                        <USelectMenu v-model="userStore.conversionType" :items="conversionTypes" value-attribute="value"
                            option-attribute="label" />
                    </UFormField>

                    <!-- Converter Parameters -->
                    <UFormField :label="$t('components.settings.tools.csv_converter.account_name')" name="accountName"
                        required>
                        <UInput v-model="converterParams.accountName"
                            :placeholder="$t('components.settings.tools.csv_converter.account_name_placeholder')"
                            @blur="saveConverterParams" />
                    </UFormField>

                    <UFormField :label="$t('components.settings.tools.csv_converter.account_fullname')"
                        name="accountFullname" required>
                        <UInput v-model="converterParams.accountFullname"
                            :placeholder="$t('components.settings.tools.csv_converter.account_fullname_placeholder')"
                            @blur="saveConverterParams" />
                    </UFormField>

                    <UFormField :label="$t('components.settings.tools.csv_converter.import_name')" name="importName"
                        required>
                        <UInput v-model="converterParams.importName"
                            :placeholder="$t('components.settings.tools.csv_converter.import_name_placeholder')"
                            @blur="saveConverterParams" />
                    </UFormField>

                    <div class="flex justify-start mb-4">
                        <UButton variant="soft" size="sm" color="neutral" icon="i-lucide-refresh-ccw"
                            @click="resetToDefaults">
                            {{ $t('common.actions.reset') }}
                        </UButton>
                    </div>

                    <!-- File Upload -->
                    <UFormField :label="$t('components.settings.tools.csv_converter.select_file')" name="file">
                        <UInput type="file" accept=".csv,.xls,.xlsx" @change="handleFileSelect" />
                    </UFormField>

                    <!-- Selected File Info -->
                    <div v-if="selectedFile" class="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <UIcon name="i-lucide-file-text" class="text-primary" />
                                <span class="text-sm font-medium">{{ selectedFile.name }}</span>
                                <span class="text-xs text-gray-500">({{ formatFileSize(selectedFile.size) }})</span>
                            </div>
                            <UButton variant="ghost" color="error" icon="i-lucide-x" size="xs" @click="clearFile" />
                        </div>
                    </div>

                    <!-- Convert Button -->
                    <div class="flex justify-start gap-4 pt-4">
                        <UButton type="submit" form="converterForm" :disabled="!selectedFile || isConverting"
                            :loading="isConverting" color="primary" icon="i-lucide-refresh-cw">
                            {{ $t('common.actions.convert') }}
                        </UButton>
                    </div>

                    <!-- Success Message -->
                    <UAlert v-if="conversionSuccess" color="success" variant="soft" icon="i-lucide-check-circle"
                        :title="$t('components.settings.tools.csv_converter.success')"
                        :description="$t('components.settings.tools.csv_converter.success_description')" />

                    <!-- Error Message -->
                    <UAlert v-if="conversionError" color="error" variant="soft" icon="i-lucide-alert-circle"
                        :title="$t('components.settings.tools.csv_converter.error')" :description="conversionError" />
                </UForm>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const { updateUserSettings, getUserSetting } = useAuth()
const userStore = useUserStore()

const selectedFile = ref<File | null>(null)
const isConverting = ref(false)
const conversionSuccess = ref(false)
const conversionError = ref<string | null>(null)

// Default parameters for each conversion type
const defaultParams = {
    'schwab-options': {
        accountName: 'Schwab',
        accountFullname: 'Charles Schwab Options',
        importName: 'SchwabOptions',
    },
    'tradingview': {
        accountName: 'TradingView',
        accountFullname: 'TradingView Trading Account',
        importName: 'TradingView',
    },
}

// Converter parameters schema
const converterParamsSchema = z.object({
    accountName: z.string().min(4),
    accountFullname: z.string().min(4),
    importName: z.string().min(4),
})

// Converter parameters state - will be loaded based on conversion type
const converterParams = reactive({
    accountName: '',
    accountFullname: '',
    importName: '',
})

const conversionTypes = computed(() => [
    {
        label: t('components.settings.tools.csv_converter.types.schwab_options'),
        value: 'schwab-options',
    },
    {
        label: t('components.settings.tools.csv_converter.types.tradingview'),
        value: 'tradingview',
    },
])

// Watch conversion type changes to load appropriate parameters
watch(() => userStore.conversionType.value, (newTypeValue) => {
    loadConverterParamsForType(newTypeValue as 'schwab-options' | 'tradingview')
})

// Load saved converter parameters on mount
onMounted(() => {
    loadConverterParamsForType(userStore.conversionType.value as 'schwab-options' | 'tradingview')
})

const loadConverterParamsForType = (type: 'schwab-options' | 'tradingview') => {
    const saved = getUserSetting('converterParams') as Record<string, { accountName: string; accountFullname: string; importName: string }> | undefined

    if (saved && typeof saved === 'object' && saved[type]) {
        // Load saved parameters for this type
        converterParams.accountName = saved[type].accountName
        converterParams.accountFullname = saved[type].accountFullname
        converterParams.importName = saved[type].importName
    } else {
        // Load default parameters for this type
        const defaults = defaultParams[type]
        converterParams.accountName = defaults.accountName
        converterParams.accountFullname = defaults.accountFullname
        converterParams.importName = defaults.importName
    }
}

const resetToDefaults = async () => {
    const type = userStore.conversionType.value as 'schwab-options' | 'tradingview'
    const defaults = defaultParams[type]
    converterParams.accountName = defaults.accountName
    converterParams.accountFullname = defaults.accountFullname
    converterParams.importName = defaults.importName
    await saveConverterParams()
}

const saveConverterParams = async () => {
    try {
        // Validate before saving
        converterParamsSchema.parse(converterParams)

        // Get existing saved params
        const existing = (getUserSetting('converterParams') as Record<string, { accountName: string; accountFullname: string; importName: string }>) || {}

        // Update params for current conversion type
        const updated = {
            ...existing,
            [userStore.conversionType.value]: {
                accountName: converterParams.accountName,
                accountFullname: converterParams.accountFullname,
                importName: converterParams.importName,
            },
        }

        await updateUserSettings({
            converterParams: updated,
        })
    } catch {
        // Validation error - don't save
    }
}

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
        selectedFile.value = target.files[0]
        conversionSuccess.value = false
        conversionError.value = null
    }
}

const clearFile = () => {
    selectedFile.value = null
    conversionSuccess.value = false
    conversionError.value = null
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const onSubmitConvert = async (event: FormSubmitEvent<typeof converterParams>) => {
    if (!selectedFile.value) {
        conversionError.value = t('components.settings.tools.csv_converter.select_file')
        return
    }

    isConverting.value = true
    conversionSuccess.value = false
    conversionError.value = null

    try {
        const formData = new FormData()
        formData.append('file', selectedFile.value)
        formData.append('conversionType', userStore.conversionType.value)
        formData.append('accountName', event.data.accountName)
        formData.append('accountFullname', event.data.accountFullname)
        formData.append('importName', event.data.importName)

        const response = await $fetch('/api/tools/convert', {
            method: 'POST',
            body: formData,
        })

        // Download the converted file
        const blob = new Blob([response as string], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedFile.value.name.replace(/\.[^/.]+$/, '')}_converted.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        conversionSuccess.value = true
        selectedFile.value = null
    } catch (error: unknown) {
        const err = error as { data?: { message?: string }; message?: string }
        conversionError.value = err.data?.message || err.message || t('components.settings.tools.csv_converter.unknown_error')
    } finally {
        isConverting.value = false
    }
}
</script>
