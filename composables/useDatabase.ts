/**
 * Composable for database management
 */

interface Database {
    id: number
    name: string
    displayName: string
    isDefault: boolean
    createdAt?: string
}

const DB_STORAGE_KEY = 'currentDatabase'

function loadPersistedDatabase(): Database | null {
    if (import.meta.server) return null
    try {
        const raw = localStorage.getItem(DB_STORAGE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export const useDatabase = () => {
    const currentDatabase = useState<Database | null>('currentDatabase', () => loadPersistedDatabase())
    const databases = useState<Database[]>('databases', () => [])

    // Persist currentDatabase changes to localStorage
    if (import.meta.client) {
        watch(currentDatabase, (val) => {
            if (val) {
                localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(val))
            } else {
                localStorage.removeItem(DB_STORAGE_KEY)
            }
        })
    }

    /**
     * Fetch list of databases for current user
     */
    const fetchDatabases = async () => {
        try {
            const data = await $fetch<Database[]>('/api/database/list')
            databases.value = data
            return data
        } catch (error) {
            console.error('Failed to fetch databases:', error)
            throw error
        }
    }

    /**
     * Create a new database
     */
    const createDatabase = async (name: string, displayName: string) => {
        try {
            const data = await $fetch<Database>('/api/database/create', {
                method: 'POST',
                body: { name, displayName }
            })
            databases.value.push(data)
            return data
        } catch (error) {
            console.error('Failed to create database:', error)
            throw error
        }
    }

    /**
     * Select a database as active
     */
    const selectDatabase = async (databaseId: number) => {
        try {
            const data = await $fetch<Database>('/api/database/select', {
                method: 'POST',
                body: { databaseId }
            })
            currentDatabase.value = data
            return data
        } catch (error) {
            console.error('Failed to select database:', error)
            throw error
        }
    }

    /**
     * Delete a database with password verification
     */
    const deleteDatabase = async (databaseId: number, password: string) => {
        try {
            await $fetch('/api/database/delete', {
                method: 'DELETE',
                body: { databaseId, password }
            })
            // Remove deleted database from list
            databases.value = databases.value.filter(db => db.id !== databaseId)
            // Clear current database if it was deleted
            if (currentDatabase.value?.id === databaseId) {
                currentDatabase.value = null
            }
        } catch (error) {
            console.error('Failed to delete database:', error)
            throw error
        }
    }

    /**
     * Get current database from state
     */
    const getCurrentDatabase = () => currentDatabase.value

    /**
     * Check if user has any databases
     */
    const hasDatabases = computed(() => databases.value.length > 0)

    /**
     * Get default database if exists
     */
    const getDefaultDatabase = computed(() =>
        databases.value.find(db => db.isDefault) || databases.value[0] || null
    )

    const clearCurrentDatabase = () => {
        currentDatabase.value = null
        if (import.meta.client) {
            localStorage.removeItem(DB_STORAGE_KEY)
        }
    }

    return {
        currentDatabase,
        databases,
        fetchDatabases,
        createDatabase,
        selectDatabase,
        deleteDatabase,
        getCurrentDatabase,
        clearCurrentDatabase,
        hasDatabases,
        getDefaultDatabase
    }
}
