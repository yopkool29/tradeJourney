import type { Ref } from 'vue'
import { decryptData } from '~/utils/decrypt'

export interface StorageFile {
    file_id: string
    filename: string
    timestamp: string
    file_size: number
    retrieved: boolean
}

export interface StorageListResponse {
    count: number
    files: StorageFile[]
}

export const useStorageServer = () => {
    const userStore = useUserStore()
    const { log_error } = useLogView()

    const storageUrl = computed(() => userStore.user?.settings_object?.storageUrl || '')
    const storageToken = computed(() => userStore.user?.token || '')
    const storagePassword = computed(() => userStore.user?.settings_object?.storagePassword || '')

    /**
     * List all available files on the storage server (via proxy)
     */
    const listFiles = async (): Promise<StorageFile[]> => {
        try {
            const response = await $fetch<StorageListResponse>('/api/storage/list', {
                method: 'GET'
            })

            return response.files || []
        } catch (error: any) {
            log_error(`Failed to list files from storage server: ${error.message}`)
            return []
        }
    }

    /**
     * Retrieve a file from the storage server (via proxy) and decrypt it
     */
    const retrieveFile = async (fileId: string): Promise<string | null> => {
        try {
            // Get encrypted file from server
            const encryptedData = await $fetch<string>(`/api/storage/retrieve/${fileId}`, {
                method: 'GET',
                responseType: 'text'
            })

            console.log(storagePassword.value)

            // Decrypt the file with password
            const decryptedData = decryptData(encryptedData, storagePassword.value)
            
            console.log(decryptedData)

            if (!decryptedData) {
                log_error(`Failed to decrypt file ${fileId}`)
                return null
            }

            return decryptedData
        } catch (error: any) {
            log_error(`Failed to retrieve file ${fileId}: ${error.message}`)
            return null
        }
    }

    /**
     * Delete a file from the storage server (via proxy)
     */
    const deleteFile = async (fileId: string): Promise<boolean> => {
        try {
            await $fetch(`/api/storage/delete/${fileId}`, {
                method: 'DELETE'
            })

            return true
        } catch (error: any) {
            log_error(`Failed to delete file ${fileId}: ${error.message}`)
            return false
        }
    }

    return {
        storageUrl,
        storageToken,
        storagePassword,
        listFiles,
        retrieveFile,
        deleteFile
    }
}
