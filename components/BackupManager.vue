<template>
    <div class="space-y-6">
        <!-- Create Backup Section -->
        <UCard>
            <template #header>
                <h3 class="text-lg font-semibold">{{ $t('components.backup_manager.create.title') }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ $t('components.backup_manager.create.description') }}
                </p>
            </template>

            <UButton :loading="isCreatingBackup" :disabled="isCreatingBackup" color="primary" @click="createBackup">
                <template v-if="!isCreatingBackup" #leading>
                    <UIcon name="i-heroicons-cloud-arrow-down" class="w-5 h-5" />
                </template>
                {{ isCreatingBackup ? $t('components.backup_manager.create.in_progress') : $t('components.backup_manager.create.button') }}
            </UButton>
        </UCard>

        <!-- Restore Backup Section -->
        <UCard>
            <template #header>
                <h3 class="text-lg font-semibold">{{ $t('components.backup_manager.restore.title') }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ $t('components.backup_manager.restore.description') }}</p>
            </template>

            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <input ref="fileInput" type="file" accept=".zip" class="hidden" @change="handleFileSelect" />
                    <UButton variant="ghost" @click="fileInput?.click()">
                        <UIcon name="i-heroicons-folder-open" class="w-5 h-5 mr-1" />
                        {{ $t('components.backup_manager.restore.select_file') }}
                    </UButton>
                    <span v-if="selectedFile" class="text-sm text-gray-700 dark:text-gray-300">
                        {{ selectedFile.name }}
                    </span>
                </div>

                <div class="flex gap-2">
                    <UButton v-if="selectedFile" :loading="isRestoring" :disabled="isRestoring" color="error" class="mt-2" @click="confirmRestore()">
                        <template v-if="!isRestoring" #leading>
                            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
                        </template>
                        {{ isRestoring ? $t('components.backup_manager.restore.in_progress') : $t('components.backup_manager.restore.button') }}
                    </UButton>

                    <UButton v-if="selectedFile" variant="soft" color="neutral" class="mt-2" @click="resetFileInput">{{
                        $t('common.actions.cancel')
                    }}</UButton>
                </div>
            </div>
        </UCard>

        <!-- Backup List Section -->
        <UCard>
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">{{ $t('components.backup_manager.list.title') }}</h3>
                    <UButton color="neutral" variant="ghost" :loading="isLoading" :disabled="isLoading" size="sm" @click="fetchBackups">
                        <template #leading>
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                        </template>
                        {{ $t('components.backup_manager.list.refresh') }}
                    </UButton>
                </div>
            </template>

            <div v-if="isLoading && backups.length === 0" class="space-y-3">
                <USkeleton v-for="i in 3" :key="`skeleton-${i}`" class="h-16 w-full" />
            </div>

            <UAlert
                v-else-if="backups.length === 0"
                :title="$t('components.backup_manager.list.empty.title')"
                :description="$t('components.backup_manager.list.empty.description')"
                icon="i-heroicons-inbox"
                color="neutral"
                variant="soft"
                class="mb-4"
            />

            <div v-else class="space-y-3">
                <UCard
                    v-for="backup in backups"
                    :key="backup.name"
                    class="backup-item hover:shadow-md transition-shadow ring-1 ring-gray-200 dark:ring-gray-800"
                    :ui="{
                        body: 'py-3 sm:py-3',
                    }"
                >
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="font-medium">{{ formatDate(backup.timestamp, true, locale) }}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                <span class="mr-2 font-semibold">{{ $t('components.backup_manager.list.item.archive') }}:</span>{{ backup.name }}
                            </div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">
                                <span class="mr-2 font-semibold">{{ $t('components.backup_manager.list.item.size') }}:</span
                                >{{ formatToReadableSize(backup.size) }}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <CommonModalDelete @confirm="deleteBackup(backup.name)">
                                <template #trigger>
                                    <UTooltip :text="$t('common.actions.delete')">
                                        <UButton color="error" variant="ghost" icon="i-heroicons-trash" />
                                    </UTooltip>
                                </template>
                                <template #content>
                                    <p>{{ $t('components.backup_manager.list.actions.delete_confirm') }}</p>
                                </template>
                            </CommonModalDelete>
                            <UTooltip :text="$t('components.backup_manager.list.actions.download')">
                                <UButton
                                    color="neutral"
                                    variant="ghost"
                                    icon="i-heroicons-arrow-down-tray"
                                    :loading="isLoading"
                                    :disabled="isLoading"
                                    @click="downloadBackup(backup.url, backup.name)"
                                />
                            </UTooltip>
                        </div>
                    </div>
                </UCard>
            </div>
        </UCard>

        <!-- Confirmation Dialog -->
        <CommonModalDefault v-model:open="showConfirmDialog" :title="$t('components.backup_manager.restore_confirm.title')">
            <template #content>
                <p class="mb-4">{{ $t('components.backup_manager.restore_confirm.message', { date: formatDate(backupToRestore?.timestamp!) }) }}</p>
                <p class="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                    <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 mr-1" />
                    {{ $t('components.backup_manager.restore_confirm.warning') }}
                </p>
            </template>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <UButton variant="ghost" :disabled="isRestoring" @click="showConfirmDialog = false"> {{ $t('common.actions.cancel') }} </UButton>
                    <UButton
                        color="error"
                        variant="solid"
                        :loading="isRestoring"
                        :disabled="isRestoring"
                        class="ml-2"
                        data-testid="confirm-restore-button"
                        @click="confirmRestoreBackup"
                    >
                        <template v-if="!isRestoring" #leading>
                            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
                        </template>
                        {{ isRestoring ? $t('components.backup_manager.restore.in_progress') : $t('components.backup_manager.restore.button') }}
                    </UButton>
                </div>
            </template>
        </CommonModalDefault>
    </div>
</template>

<script setup lang="ts">
import type { InternalApi } from 'nitropack'
import { formatDate } from '~/utils/index'

const { t, locale } = useI18n()

type Backup = InternalApi['/api/backup/list']['get']['backups'][number]

const toast = useToast()

// State
const backups = ref<Backup[]>([])
const isLoading = ref<boolean>(false)
const isCreatingBackup = ref<boolean>(false)
const isRestoring = ref<boolean>(false)
const selectedFile = ref<File | null>(null)
const backupToRestore = ref<Backup | null>(null)
const showConfirmDialog = ref<boolean>(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Fetch list of backups
const fetchBackups = async () => {
    try {
        isLoading.value = true
        type ApiResponse = InternalApi['/api/backup/list']['get']
        const response = await $fetch<ApiResponse>('/api/backup/list', {
            method: 'GET',
        })

        if (!response.success) {
            throw new Error('Failed to fetch backups')
        }

        backups.value = response.backups
    } catch {
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.load_failed'),
            icon: 'i-heroicons-exclamation-circle',
            color: 'error',
            duration: 2000,
        })
    } finally {
        isLoading.value = false
    }
}

const deleteBackup = async (fileName: string) => {
    try {
        type ApiResponse = InternalApi['/api/backup']['delete']
        const response = await $fetch<ApiResponse>('/api/backup', {
            method: 'DELETE',
            params: {
                file: fileName,
            },
        })

        if (!response.success) {
            throw new Error('Failed to delete backup')
        }

        toast.add({
            title: t('common.title.success'),
            description: t('components.backup_manager.success.backup_deleted'),
            icon: 'i-heroicons-check-circle',
            color: 'success',
            duration: 2000,
        })
    } catch {
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.delete_failed'),
            icon: 'i-heroicons-exclamation-circle',
            color: 'error',
            duration: 2000,
        })
    } finally {
        fetchBackups()
    }
}

// Create a new backup
const createBackup = async () => {
    try {
        isCreatingBackup.value = true

        type ApiResponse = InternalApi['/api/backup']['get']

        const response = await $fetch<ApiResponse>('/api/backup', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.success) {
            throw new Error('Failed to create backup')
        }

        if (!response.downloadUrl) {
            throw new Error('No download URL received from server')
        }

        downloadBackup(response.downloadUrl, response.filename || 'backup.zip')

        toast.add({
            title: t('common.title.success'),
            description: t('components.backup_manager.success.backup_created'),
            icon: 'i-heroicons-check-circle',
            color: 'success',
            duration: 2000,
        })
        await fetchBackups()
    } catch {
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.create_failed'),
            icon: 'i-heroicons-exclamation-circle',
            color: 'error',
            duration: 2000,
        })
    } finally {
        isCreatingBackup.value = false
    }
}

const config = useRuntimeConfig()
const MAX_FILE_SIZE = config.public.maxFileSize || 8 * 1024 * 1024 // Default to 8MB if not set

// Handle file selection for restore
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
        selectedFile.value = null
        return
    }

    if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.file_too_large', { size: maxSizeMB }),
            color: 'error',
            icon: 'i-heroicons-exclamation-circle',
            duration: 4000,
        })
        // Reset the file input
        if (fileInput.value) {
            fileInput.value.value = ''
        }
        selectedFile.value = null
        return
    }

    selectedFile.value = file
}

// Reset file input to allow selecting the same file again
const resetFileInput = () => {
    if (fileInput.value) {
        fileInput.value.value = ''
    }
    selectedFile.value = null
}

// Confirm before restoring
const confirmRestore = () => {
    if (selectedFile.value) {
        // Create a backup-like object with the selected file
        backupToRestore.value = {
            name: selectedFile.value.name,
            size: selectedFile.value.size,
            timestamp: selectedFile.value.lastModified,
        } as unknown as Backup
        showConfirmDialog.value = true
    } else {
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.no_file_selected'),
            color: 'error',
        })
    }
}

// Restore from backup in the list
const confirmRestoreBackup = async () => {
    if (!backupToRestore.value || !selectedFile.value) return

    // DEBUG
    // isRestoring.value = false
    // showConfirmDialog.value = false

    // emit('imported')
    // return

    try {
        isRestoring.value = true

        // Double check file size on the client side
        if (selectedFile.value.size > MAX_FILE_SIZE) {
            const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)
            throw new Error(`The file exceeds the maximum size of ${maxSizeMB} MB`)
        }

        // Create FormData to send the file
        const formData = new FormData()
        formData.append('backup', selectedFile.value)

        type ApiResponse = InternalApi['/api/backup']['post']
        const response = await $fetch<ApiResponse>('/api/backup', {
            method: 'POST',
            body: formData,
            // Important: Don't set Content-Type header, let the browser set it with the boundary
            headers: {
                Accept: 'application/json',
            },
        })

        if (!response.success) {
            throw new Error('Failed to restore backup')
        }

        toast.add({
            title: t('common.title.success'),
            description: t('components.backup_manager.success.backup_restored'),
            icon: 'i-heroicons-check-circle',
            color: 'success' as const,
            duration: 2000,
        })

        emit('imported')

    } catch {
        toast.add({
            title: t('common.title.error'),
            description: 'Failed to restore backup',
            icon: 'i-heroicons-exclamation-circle',
            color: 'error' as const,
            duration: 2000,
        })
    } finally {
        isRestoring.value = false
        showConfirmDialog.value = false
    }
}

// Function to download a backup file
const downloadBackup = (url: string, filename: string) => {
    try {
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error: unknown) {
        console.error('Failed to download backup:', error)
        const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue'
        toast.add({
            title: t('common.title.error'),
            description: t('components.backup_manager.errors.download_failed', { error: errorMessage }),
            icon: 'i-heroicons-exclamation-circle',
            color: 'error',
            duration: 2000,
        })
        throw error
    }
}

// Initialize
onMounted(() => {
    fetchBackups()
})

const emit = defineEmits(['imported'])

</script>

<style scoped>
/* Custom styles can be added here if needed */
</style>
