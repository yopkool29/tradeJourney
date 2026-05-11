<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">
                    {{ isEditing ? $t('components.import.profile_form.edit_title') : $t('components.import.profile_form.add_title') }}
                </h2>
                <UButton variant="ghost" icon="i-lucide-x" size="xs" @click="emit('cancel')" />
            </div>
        </template>

        <UForm id="profileForm" ref="formRef" :state="formState" :schema="formSchema" :validate-on="['change', 'input']" class="space-y-6" @submit="onSubmit" @error="onError">
            <!-- Nom du profil -->
            <UFormField :label="$t('components.import.profile_form.name')" name="name" required>
                <UInput
                    v-model="formState.name"
                    :placeholder="$t('components.import.profile_form.name_placeholder')"
                    autofocus
                />
            </UFormField>

            <!-- Type de provider -->
            <UFormField :label="$t('components.import.profile_form.provider')" name="provider" required>
                <URadioGroup
                    v-model="formState.provider"
                    :items="providerItems"
                    variant="table"
                    class="w-full"
                />
            </UFormField>

            <!-- Timezone -->
            <CommonTimezoneSelector
                :import-mode="formState.importMode"
                :timezone="formState.timezone"
                @update:import-mode="formState.importMode = $event"
                @update:timezone="formState.timezone = $event"
            />

            <!-- Keep existing trades -->
            <UFormField name="keepExistingTrades" class="select-none">
                <UCheckbox v-model="formState.keepExistingTrades" :label="$t('components.import.index.keep_existing_trades')" />
            </UFormField>

            <!-- Use Cloud Storage (pour provider standard et nt8) -->
            <UFormField v-if="formState.provider === 'standard' || formState.provider === 'nt8'" name="metadata.useCloudStorage" class="select-none">
                <UCheckbox v-model="formState.metadata.useCloudStorage" :label="$t('components.import.profile_form.use_cloud_storage')" />
                <template #description>
                    <span class="text-sm text-secondary">{{ $t('components.import.profile_form.use_cloud_storage_desc') }}</span>
                </template>
            </UFormField>

            <!-- Instrument type -->
            <UFormField :label="$t('components.import.profile_form.instrument_type')" name="instrumentType">
                <USelect
                    v-model="formState.instrumentType"
                    :items="INSTRUMENT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))"
                    class="w-48"
                />
                <template #description>
                    <span class="text-sm text-secondary">{{ $t('components.import.profile_form.instrument_type_desc') }}</span>
                </template>
            </UFormField>

            <!-- Config IBKR Flex Query (si provider === 'ibkr-api') -->
            <div v-if="formState.provider === 'ibkr-api'" class="section-separator">
                <h3 class="section-subtitle-lg">IBKR Flex Query API</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField name="ibkrFlexQueryToken" label="Flex Query Token">
                        <UInput
                            v-model="formState.ibkrFlexQueryToken"
                            type="text"
                            placeholder="Your IBKR Flex Query token"
                        />
                        <template #description>
                            <span class="text-sm text-secondary">Token from IBKR Account Management → Flex Web Service</span>
                        </template>
                    </UFormField>
                    <UFormField name="ibkrFlexQueryId" label="Flex Query ID">
                        <UInput
                            v-model="formState.ibkrFlexQueryId"
                            type="text"
                            placeholder="12345678"
                        />
                        <template #description>
                            <span class="text-sm text-secondary">Query ID from your configured Flex Query</span>
                        </template>
                    </UFormField>
                </div>
            </div>

            <!-- Tags par défaut pour les journées -->
            <div>
                <h3 class="text-sm font-semibold mb-2">{{ $t('components.import.index.default_day_tags') }}</h3>
                <CommonTagSelector
                    v-model="formState.dayTagIds"
                    :tag-groups="tagGroups"
                    field-name="dayTagIds"
                    :show-manage-button="false"
                />
            </div>

            <!-- Tags par défaut pour les trades -->
            <div>
                <h3 class="text-sm font-semibold mb-2">{{ $t('components.import.index.default_trade_tags') }}</h3>
                <CommonTagSelector
                    v-model="formState.tradeTagIds"
                    :tag-groups="tagGroups"
                    field-name="tradeTagIds"
                    :show-manage-button="false"
                />
            </div>
        </UForm>

        <template #footer>
            <div class="flex gap-2">
                <UButton type="submit" form="profileForm">
                    {{ isEditing ? $t('common.actions.save') : $t('components.import.profile_form.create') }}
                </UButton>
                <UButton type="button" variant="soft" @click="emit('cancel')">
                    {{ $t('common.actions.cancel') }}
                </UButton>
            </div>
        </template>
    </UCard>
</template>

<script setup lang="ts">
import type { ImportProfileType, CreateImportProfileType } from '~/schema/importProfile'
import { CreateImportProfileSchema, INSTRUMENT_TYPES, DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER } from '~/schema/importProfile'
import type { ReportType } from '~/type'
import { InstrumentType } from '~/type'
import type { TagGroupType } from '~/schema/tagGroup'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'

const config = useRuntimeConfig()

const props = defineProps<{
    profile?: ImportProfileType | null
    tagGroups: TagGroupType[]
}>()

const emit = defineEmits<{
    cancel: []
    save: [data: CreateImportProfileType & { id?: number }]
}>()

const formRef = ref()
const isEditing = computed(() => !!props.profile)

const formState = reactive<{
    name: string
    provider: ReportType
    importMode: 'local' | 'utc'
    timezone: string
    keepExistingTrades: boolean
    instrumentType: InstrumentType
    dayTagIds: number[]
    tradeTagIds: number[]
    ibkrFlexQueryToken: string
    ibkrFlexQueryId: string
    metadata: { useCloudStorage: boolean }
}>({
    name: props.profile?.name || '',
    provider: (props.profile?.provider as ReportType) || 'mt5',
    importMode: (props.profile?.importMode as 'local' | 'utc') || 'local',
    timezone: props.profile?.timezone || 'Europe/Paris',
    keepExistingTrades: props.profile?.keepExistingTrades ?? false,
    instrumentType: props.profile?.instrumentType || DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER[(props.profile?.provider as ReportType) || 'mt5'] || 'any',
    dayTagIds: props.profile?.dayTags ? [...props.profile.dayTags] : [],
    tradeTagIds: props.profile?.tradeTags ? [...props.profile.tradeTags] : [],
    ibkrFlexQueryToken: props.profile?.ibkrFlexQueryToken || '',
    ibkrFlexQueryId: props.profile?.ibkrFlexQueryId || '',
    metadata: { useCloudStorage: props.profile?.metadata?.useCloudStorage ?? false },
})

// Re-initialize form when profile prop changes (for edit mode)
watch(() => props.profile, (newProfile) => {
    if (newProfile) {
        formState.name = newProfile.name
        formState.provider = newProfile.provider as ReportType
        formState.importMode = newProfile.importMode as 'local' | 'utc'
        formState.timezone = newProfile.timezone
        formState.keepExistingTrades = newProfile.keepExistingTrades
        formState.metadata.useCloudStorage = newProfile.metadata?.useCloudStorage ?? false
        formState.instrumentType = newProfile.instrumentType || DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER[newProfile.provider] || 'any'
        formState.dayTagIds = [...newProfile.dayTags]
        formState.tradeTagIds = [...newProfile.tradeTags]
        formState.ibkrFlexQueryToken = newProfile.ibkrFlexQueryToken || ''
        formState.ibkrFlexQueryId = newProfile.ibkrFlexQueryId || ''
    }
}, { immediate: true })

// Auto-set default instrumentType when provider changes (only for new profiles)
watch(() => formState.provider, (newProvider) => {
    if (!isEditing.value) {
        formState.instrumentType = DEFAULT_INSTRUMENT_TYPE_BY_PROVIDER[newProvider] || 'any'
    }
})

const formSchema = CreateImportProfileSchema

const providerItems = computed(() => {
    const items = [
        { value: 'mt5', label: getProviderLabel('mt5') },
        { value: 'nt8', label: getProviderLabel('nt8') },
        { value: 'ibkr', label: getProviderLabel('ibkr') },
        { value: 'ibkr-api', label: getProviderLabel('ibkr-api') },
        { value: 'standard', label: getProviderLabel('standard') },
    ]

    if (config.public.quantowerEnable === true) {
        items.splice(2, 0, { value: 'quantower', label: getProviderLabel('quantower') })
    }

    return items
})

function onSubmit(event: FormSubmitEvent<CreateImportProfileType>) {
    const data: CreateImportProfileType & { id?: number } = {
        ...event.data,
        name: event.data.name.trim(),
        ibkrFlexQueryToken: formState.provider === 'ibkr-api' ? formState.ibkrFlexQueryToken : null,
        ibkrFlexQueryId: formState.provider === 'ibkr-api' ? formState.ibkrFlexQueryId : null,
    }

    // Inclure l'ID si on est en mode édition
    if (props.profile?.id) {
        data.id = props.profile.id
    }

    emit('save', data)
}

function onError(event: FormErrorEvent) {
    console.warn('Form validation errors:', event.errors)
}
</script>
