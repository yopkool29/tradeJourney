export interface Database {
    id: number
    name: string
    displayName: string
    isDefault: boolean
    createdAt: string
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
    const { reloadActivePlugins } = usePlugins()

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

    const fetchDatabases = async () => {
        try {
            const data = await $fetch('/api/database/list')
            databases.value = data
            return data
        } catch (error) {
            console.error('Failed to fetch databases:', error)
            throw error
        }
    }

    const createDatabase = async (name: string, displayName: string) => {
        try {
            const data = await $fetch('/api/database/create', {
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

    const selectDatabase = async (databaseId: number, skipTags = false) => {
        try {
            const data = await $fetch('/api/database/select', {
                method: 'POST',
                body: { databaseId }
            })

            currentDatabase.value = data

            reloadActivePlugins()

            // Charger les tags de la nouvelle base de données (sauf si skipTags=true)
            if (!skipTags) {
                const { fetchGroups } = useTags()
                await fetchGroups()
            }

            return data
        } catch (error) {
            console.error('Failed to select database:', error)
            throw error
        }
    }

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

    const getCurrentDatabase = () => currentDatabase.value

    const hasDatabases = computed(() => databases.value.length > 0)

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
