import type { InternalApi } from 'nitropack'

type Backup = InternalApi['/api/backup/list']['get']['backups'][number]

export const useBackup = () => {
    const { success: toastSuccess, error: toastError } = useAppToast()
    const { t } = useI18n()
    const config = useRuntimeConfig()
    const MAX_FILE_SIZE = config.public.maxFileSize || 8 * 1024 * 1024

    const backups = ref<Backup[]>([])
    const isLoading = ref(false)
    const isCreatingBackup = ref(false)
    const isRestoring = ref(false)

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
            toastError(t('common.title.error'), t('components.backup_manager.errors.load_failed'))
        } finally {
            isLoading.value = false
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

            toastSuccess(t('common.title.success'), t('components.backup_manager.success.backup_created'))
            await fetchBackups()
        } catch {
            toastError(t('common.title.error'), t('components.backup_manager.errors.create_failed'))
        } finally {
            isCreatingBackup.value = false
        }
    }

    // Delete a backup
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

            toastSuccess(t('common.title.success'), t('components.backup_manager.success.backup_deleted'))
        } catch {
            toastError(t('common.title.error'), t('components.backup_manager.errors.delete_failed'))
        } finally {
            await fetchBackups()
        }
    }

    // Restore from backup
    const restoreBackup = async (file: File) => {
        try {
            isRestoring.value = true

            // Double check file size on the client side
            if (file.size > MAX_FILE_SIZE) {
                const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)
                throw new Error(`The file exceeds the maximum size of ${maxSizeMB} MB`)
            }

            // Create FormData to send the file
            const formData = new FormData()
            formData.append('backup', file)

            type ApiResponse = InternalApi['/api/backup']['post']
            const response = await $fetch<ApiResponse>('/api/backup', {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                },
            })

            if (!response.success) {
                throw new Error('Failed to restore backup')
            }

            // Recharger les tags après la restauration
            const { fetchGroups } = useTags()
            
            await fetchGroups()

            toastSuccess(t('common.title.success'), t('components.backup_manager.success.backup_restored'))

            return true
        } catch {
            toastError(t('common.title.error'), t('components.backup_manager.errors.restore_failed'))
            return false
        } finally {
            isRestoring.value = false
        }
    }

    // Download a backup file
    const downloadBackup = async (url: string, filename: string) => {
        try {
            const { downloadUrl } = useTauriDownload()
            await downloadUrl(url, filename)
        } catch (error: unknown) {
            console.error('Failed to download backup:', error)

            const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue'

            toastError(t('common.title.error'), t('components.backup_manager.errors.download_failed', { error: errorMessage }))
            throw error
        }
    }

    // Validate file size
    const validateFileSize = (file: File): boolean => {
        if (file.size > MAX_FILE_SIZE) {
            const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)
            toastError(t('common.title.error'), t('components.backup_manager.errors.file_too_large', { size: maxSizeMB }))
            return false
        }
        return true
    }

    return {
        backups,
        isLoading,
        isCreatingBackup,
        isRestoring,
        MAX_FILE_SIZE,
        fetchBackups,
        createBackup,
        deleteBackup,
        restoreBackup,
        downloadBackup,
        validateFileSize,
    }
}
