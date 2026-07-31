<template>
    <CommonModalDefault v-model:open="isOpen" :title="$t('pages.select_database.rename_database')">
        <template #content>
            <UForm id="renameDatabaseForm" :state="state" :schema="schema" @submit="onSubmit">
                <div class="space-y-4">
                    <UFormField :label="$t('pages.select_database.display_name')" name="displayName" required>
                        <UInput 
                            v-model="state.displayName" 
                            autofocus 
                            :placeholder="$t('pages.select_database.enter_display_name')"
                            icon="i-heroicons-pencil"
                        />
                    </UFormField>

                    <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
                    </div>
                </div>
            </UForm>
        </template>

        <template #footer>
            <div class="flex justify-end gap-4">
                <UButton 
                    type="submit" 
                    form="renameDatabaseForm" 
                    color="primary" 
                    :loading="loading"
                    :disabled="!state.displayName || state.displayName === database?.displayName"
                >
                    {{ $t('common.actions.save') }}
                </UButton>
                <UButton type="button" variant="ghost" color="neutral" :disabled="loading" @click="isOpen = false">
                    {{ $t('common.actions.cancel') }}
                </UButton>
            </div>
        </template>
    </CommonModalDefault>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

interface Database {
    id: number
    name: string
    displayName: string
    isDefault: boolean
}

const props = defineProps<{
    modelValue: boolean
    database: Database | null
}>()

const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    renamed: [database: Database]
}>()

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
        // Initialize form with current database name when modal opens
        state.displayName = props.database?.displayName || ''
        error.value = ''
    }
})

const schema = z.object({
    displayName: z.string().min(8),
})

const state = reactive({
    displayName: '',
})

const loading = ref(false)
const error = ref('')

const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
    if (!props.database) return

    loading.value = true
    error.value = ''

    try {
        // Call API to rename database
        await $fetch(`/api/database/${props.database.id}/rename`, {
            method: 'PATCH',
            body: {
                displayName: event.data.displayName,
            },
        })

        emit('renamed', {
            ...props.database,
            displayName: event.data.displayName,
        })
        isOpen.value = false

        // Reset form
        state.displayName = ''
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        error.value = message || ''
    } finally {
        loading.value = false
    }
}
</script>
