<template>
    <div class="space-y-6">
        <!-- Create Backup Section -->
        <UCard>
            <template #header>
                <h3 class="section-title-semibold">{{ $t('components.backup_manager.create.title') }}</h3>
                <p class="description-text">
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
                <h3 class="section-title-semibold">{{ $t('components.backup_manager.restore.title') }}</h3>
                <p class="description-text">{{ $t('components.backup_manager.restore.description') }}</p>
            </template>

            <div class="space-y-4">
                <div class="form-row">
                    <input ref="fileInput" type="file" accept=".zip" class="hidden" @change="handleFileSelect" />
                    <UButton variant="ghost" @click="fileInput?.click()">
                        <UIcon name="i-heroicons-folder-open" class="w-5 h-5 mr-1" />
                        {{ $t('components.backup_manager.restore.select_file') }}
                    </UButton>
                    <span v-if="selectedFile" class="text-sm text-gray-700 dark:text-gray-300">
                        {{ selectedFile.name }}
                    </span>
                </div>

                <div class="action-buttons">
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
                <div class="flex items-center gap-x-10">
                    <h3 class="section-title-semibold">{{ $t('components.backup_manager.list.title') }}</h3>
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
                    <div class="flex items-center gap-x-10">
                        <div>
                            <div class="font-medium">{{ formatDateWithUserTimezone(backup.timestamp, userStore.user?.settings_object, true, locale as 'fr' | 'en' | 'us') }}</div>
                            <div class="text-secondary-sm">
                                <span class="mr-2 font-semibold">{{ $t('components.backup_manager.list.item.archive') }}:</span>{{ backup.name }}
                            </div>
                            <div class="text-secondary-sm">
                                <span class="mr-2 font-semibold">{{ $t('components.backup_manager.list.item.size') }}:</span
                                >{{ formatToReadableSize(backup.size) }}
                            </div>
                        </div>
                        <div class="action-buttons">
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
                <p class="mb-4">{{ $t('components.backup_manager.restore_confirm.message', { date: formatDateWithUserTimezone(backupToRestore?.timestamp!, userStore.user?.settings_object, false, locale as 'fr' | 'en' | 'us') }) }}</p>
                <p class="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                    <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 mr-1" />
                    {{ $t('components.backup_manager.restore_confirm.warning') }}
                </p>
            </template>

            <template #footer>
                <div class="action-buttons-end">
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
import { formatDateWithUserTimezone } from '~/utils/date-utils'

const { locale } = useI18n()
const userStore = useUserStore()
const { backups, isLoading, isCreatingBackup, isRestoring, fetchBackups, createBackup, deleteBackup, restoreBackup, downloadBackup, validateFileSize } = useBackup()

type Backup = InternalApi['/api/backup/list']['get']['backups'][number]

// Local state
const selectedFile = ref<File | null>(null)
const backupToRestore = ref<Backup | null>(null)
const showConfirmDialog = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Handle file selection for restore
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) {
        selectedFile.value = null
        return
    }

    if (!validateFileSize(file)) {
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
        backupToRestore.value = {
            name: selectedFile.value.name,
            size: selectedFile.value.size,
            timestamp: selectedFile.value.lastModified,
        } as unknown as Backup
        showConfirmDialog.value = true
    }
}

// Restore from backup
const confirmRestoreBackup = async () => {
    if (!backupToRestore.value || !selectedFile.value) return

    const success = await restoreBackup(selectedFile.value)
    if (success) {
        emit('imported')
        resetFileInput()
    }
    showConfirmDialog.value = false
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
