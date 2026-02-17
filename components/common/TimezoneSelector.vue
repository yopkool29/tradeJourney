<template>
    <div class="flex flex-col gap-4" :class="{ 'opacity-50 pointer-events-none': disabled }">
        <UFormField :label="computedLabel" required>
            <URadioGroup v-model="localImportMode" :items="importModeItems" :disabled="disabled" />
        </UFormField>
        <div class="pt-2" />
        <!-- LOCAL mode timezone selector (visible) -->
        <UFormField v-if="localImportMode === 'local'" :label="computedTimezoneLabel" required>
            <USelect v-model="localTimezoneModel" :items="localTimezonesItems" class="select-standard" :disabled="disabled" />
        </UFormField>
        <!-- UTC mode offset selector (visible) -->
        <UFormField v-if="localImportMode === 'utc'" :label="computedUtcLabel" required>
            <USelect v-model="utcTimezoneModel" :items="utcOffsetsItems" class="select-standard" :disabled="disabled" />
        </UFormField>
    </div>
    <!-- Hidden selectors to maintain values when switching modes -->
    <div class="hidden">
        <USelect v-model="localTimezoneModel" :items="localTimezonesItems" />
        <USelect v-model="utcTimezoneModel" :items="utcOffsetsItems" />
    </div>
</template>

<script setup lang="ts">
import { IANA_TIMEZONES, UTC_OFFSETS } from '~/utils/date-utils'

const { t } = useI18n()

interface Props {
    importMode: 'local' | 'utc'
    timezone: string
    label?: string
    timezoneLabel?: string
    utcLabel?: string
    disabled?: boolean
}

interface Emits {
    (e: 'update:importMode', value: 'local' | 'utc'): void
    (e: 'update:timezone', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    label: undefined,
    timezoneLabel: undefined,
    utcLabel: undefined,
})

const emit = defineEmits<Emits>()

// Computed labels with i18n fallbacks
const computedLabel = computed(() => props.label || t('components.import.index.import_mode'))
const computedTimezoneLabel = computed(() => props.timezoneLabel || t('components.settings.options.timezone_local'))
const computedUtcLabel = computed(() => props.utcLabel || t('components.settings.options.timezone_utc_offset'))

const importModeItems = computed(() => [
    { value: 'local', label: t('components.import.index.import_mode_local') },
    { value: 'utc', label: t('components.import.index.import_mode_utc') },
])

const localTimezonesItems = computed(() => IANA_TIMEZONES.map((tz) => ({ value: tz, label: tz })))

const utcOffsetsItems = computed(() =>
    UTC_OFFSETS.map((offset) => ({
        value: String(offset),
        label: offset === 0 ? 'UTC±0' : `UTC${offset > 0 ? '+' : ''}${offset}`,
    }))
)

const lastLocalTimezone = ref(props.timezone || 'Europe/Paris')
const lastUtcOffset = ref('0')

const localImportMode = computed({
    get: () => props.importMode,
    set: (value: 'local' | 'utc') => {
        // Sauvegarder la valeur courante avant le switch
        if (props.importMode === 'local') {
            lastLocalTimezone.value = props.timezone
        } else {
            lastUtcOffset.value = props.timezone
        }
        emit('update:importMode', value)
        // Émettre la timezone par défaut pour le nouveau mode
        emit('update:timezone', value === 'utc' ? lastUtcOffset.value : lastLocalTimezone.value)
    },
})

const localTimezoneModel = computed({
    get: () => (props.importMode === 'local' ? props.timezone : 'Europe/Paris'),
    set: (value: string) => {
        if (props.importMode === 'local') {
            emit('update:timezone', value)
        }
    },
})

const utcTimezoneModel = computed({
    get: () => (props.importMode === 'utc' ? props.timezone : '0'),
    set: (value: string) => {
        if (props.importMode === 'utc') {
            emit('update:timezone', value)
        }
    },
})
</script>
