<template>
    <CommonModalDefault v-model:open="isOpen" :title="$t('database.create.title')">
        <template #content>
            <UForm id="createDatabaseForm" :state="state" :schema="schema" @submit="onSubmit" :validate-on="['submit']">
                <div class="space-y-4">
                    <UFormField :label="$t('database.create.display_name')" name="displayName" required>
                        <UInput autofocus v-model="state.displayName" :placeholder="$t('database.create.display_name_placeholder')" />
                    </UFormField>

                    <UFormField :label="$t('database.create.technical_name')" name="name" required>
                        <UInput v-model="state.name" :placeholder="$t('database.create.technical_name_placeholder')" @input="sanitizeName" />
                        <template #help>
                            <span class="text-xs text-gray-500">
                                {{ $t('database.create.technical_name_help') }}
                            </span>
                        </template>
                    </UFormField>

                    <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
                    </div>
                </div>
            </UForm>
        </template>

        <template #footer>
            <div class="flex justify-end gap-4">
                <UButton type="submit" form="createDatabaseForm" color="primary" :loading="loading">
                    {{ $t('database.create.submit') }}
                </UButton>
                <UButton type="button" variant="ghost" :disabled="loading" @click="isOpen = false">
                    {{ $t('common.cancel') }}
                </UButton>
            </div>
        </template>
    </CommonModalDefault>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
    modelValue: boolean
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    created: [database: any]
}>()

const { createDatabase } = useDatabase()
const { t } = useI18n()

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
})

watch(isOpen, (newValue) => {
    if (!newValue) {
        // Reset form when modal closes
        error.value = ''
    } else {
        // Reset form when modal opens
        state.displayName = ''
        state.name = ''
        error.value = ''
        manuallyModified.value = false
    }
})

const schema = z.object({
    displayName: z.string().min(8),
    name: z
        .string()
        .min(8)
        .regex(/^[a-z0-9_]+$/),
})

const state = reactive({
    displayName: '',
    name: '',
})

const loading = ref(false)
const error = ref('')
const manuallyModified = ref(false)

// Auto-generate technical name from display name
watch(
    () => state.displayName,
    (value) => {
        if (!manuallyModified.value) {
            state.name = sanitizeString(value)
        }
    }
)

const sanitizeString = (str: string) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
}

const sanitizeName = (event: Event) => {
    const input = event.target as HTMLInputElement
    manuallyModified.value = true
    state.name = sanitizeString(input.value)
}

const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
    loading.value = true
    error.value = ''

    try {
        const database = await createDatabase(event.data.name, event.data.displayName)
        emit('created', database)
        isOpen.value = false

        // Reset form
        state.displayName = ''
        state.name = ''
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        error.value = message || ''
    } finally {
        loading.value = false
    }
}
</script>
