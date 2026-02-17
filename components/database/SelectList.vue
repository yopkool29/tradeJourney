<template>
    <div>
        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center py-12">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-primary-500" />
        </div>

        <!-- Error Alert -->
        <UAlert v-if="errorStr" :description="errorStr || ''" color="error" variant="outline" class="mb-4" />

        <!-- Database List -->
        <div v-if="databases.length > 0" class="space-y-4">
            <h2 class="text-xl font-semibold mb-4">{{ $t('pages.select_database.existing_databases') }}</h2>

            <div class="grid gap-3">
                <UCard
                    v-for="db in databases"
                    :key="db.id"
                    class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    :class="{ 'ring-2 ring-primary-500': selectedDatabaseId === db.id }"
                    @click="selectedDatabaseId = db.id"
                    @dblclick="handleDoubleClick(db.id)"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <UIcon name="i-heroicons-circle-stack" class="text-2xl text-primary-500" />
                            <div>
                                <h3 class="font-semibold">{{ db.displayName }}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400">{{ db.name }}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <UBadge v-if="db.isDefault" color="primary" variant="subtle">
                                {{ $t('pages.select_database.default') }}
                            </UBadge>
                            <UIcon v-if="selectedDatabaseId === db.id" name="i-heroicons-check-circle" class="text-xl text-primary-500" />
                        </div>
                    </div>
                </UCard>
            </div>

            <UButton size="lg" color="primary" block :disabled="!selectedDatabaseId" :loading="isSelecting" @click="handleSelectDatabase">
                {{ $t('pages.select_database.continue') }}
            </UButton>

            <div class="flex items-center gap-4 my-4">
                <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('pages.select_database.or') }}</span>
                <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>
        </div>

        <!-- No Databases Message -->
        <div v-else class="text-center py-8">
            <UIcon name="i-heroicons-circle-stack" class="text-6xl text-gray-300 dark:text-gray-600 mb-4" />
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                {{ $t('pages.select_database.no_databases') }}
            </p>
        </div>

        <!-- Create New Database Button -->
        <div class="space-y-3">
            <UButton size="lg" color="neutral" variant="outline" block icon="i-heroicons-plus" @click="showCreateModal = true">
                {{ $t('pages.select_database.create_new') }}
            </UButton>

            <div v-if="databases.length > 0" class="flex items-center gap-4 my-4">
                <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                <span class="text-sm text-gray-500 dark:text-gray-400">{{ $t('pages.select_database.or') }}</span>
                <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>

            <UButton
                v-if="databases.length > 0"
                size="lg"
                color="error"
                variant="outline"
                block
                :disabled="!selectedDatabaseId"
                @click="showDeleteModal = true"
            >
                {{ $t('pages.select_database.delete_database') }}
            </UButton>
        </div>

        <!-- Database Creation Modal -->
        <DatabaseCreateModal v-model="showCreateModal" @created="handleDatabaseCreated" />

        <!-- Database Delete Modal -->
        <CommonModalDelete
            v-model:open="showDeleteModal"
            :title="`${$t('pages.select_database.delete_database')}: ${selectedDatabase?.displayName}`"
            confirm-color="error"
            @confirm="handleDeleteDatabase"
            @opened="deleteState.password = ''"
        >
            <template #content>
                <div class="space-y-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t('pages.select_database.delete_confirmation') }}
                    </p>

                    <UForm :state="deleteState" class="space-y-4">
                        <UFormField :label="$t('pages.select_database.password')" name="password" required>
                            <UInput
                                v-model="deleteState.password"
                                type="password"
                                class="w-full"
                                :placeholder="$t('pages.select_database.enter_password')"
                                icon="i-heroicons-lock-closed"
                                @keyup.enter="handleDeleteDatabase"
                            />
                        </UFormField>
                    </UForm>
                </div>
            </template>
        </CommonModalDelete>
    </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const { fetchDatabases, selectDatabase, currentDatabase, deleteDatabase } = useDatabase()
const { updateUserSettings, getUserSetting } = useAuth()

interface Database {
    id: number
    name: string
    displayName: string
    isDefault: boolean
}

const isLoading = ref(true)
const isSelecting = ref(false)
const databases = ref<Database[]>([])
const selectedDatabaseId = ref<number | null>(null)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const deleteState = ref({ password: '' })
const errorStr = ref<string | null>(null)

const selectedDatabase = computed(() => databases.value.find((db) => db.id === selectedDatabaseId.value))

onMounted(async () => {
    await loadDatabases()
})

const loadDatabases = async () => {
    isLoading.value = true
    try {
        const response = await fetchDatabases()

        databases.value = response

        // Pre-select database in this order:
        // 1. Current database if available
        // 2. Default database from user settings
        // 3. First database in the list
        if (currentDatabase.value) {
            selectedDatabaseId.value = currentDatabase.value.id
        } else {
            const defaultDbId = getUserSetting('defaultDatabaseId')
            const dbExists = defaultDbId ? response.find(db => db.id === defaultDbId) : null
            
            if (dbExists) {
                selectedDatabaseId.value = defaultDbId!
            } else if (response.length > 0) {
                selectedDatabaseId.value = response[0].id
            }
        }
    } catch (error) {
        console.error('Failed to load databases:', error)
    } finally {
        isLoading.value = false
    }
}

const handleSelectDatabase = async () => {
    if (!selectedDatabaseId.value) return

    isSelecting.value = true

    try {
        const { startLoading } = useGlobalLoading()
        startLoading()

        await selectDatabase(selectedDatabaseId.value)
        
        // Sauvegarder la base de données par défaut dans les settings utilisateur
        await updateUserSettings({ defaultDatabaseId: selectedDatabaseId.value })
        
        userStore.triggerDataRefresh()
        router.push('/dashboard')
    } catch (error) {
        const { stopLoading } = useGlobalLoading()
        stopLoading()
        console.error('Failed to select database:', error)
    } finally {
        isSelecting.value = false
    }
}

const handleDoubleClick = async (databaseId: number) => {
    selectedDatabaseId.value = databaseId

    await handleSelectDatabase()
}

const handleDatabaseCreated = async (database: Database) => {
    showCreateModal.value = false
    selectedDatabaseId.value = database.id
    await loadDatabases()
}

const handleDeleteDatabase = async () => {
    if (!selectedDatabaseId.value || !deleteState.value.password) {
        errorStr.value = t('api.auth.verify.unauthorized')
        return
    }

    try {
        errorStr.value = null

        // Delete database using composable
        await deleteDatabase(selectedDatabaseId.value, deleteState.value.password)

        // Clean up userStore data for this database
        const dbName = selectedDatabase.value?.name
        if (dbName) {
            userStore.clearDatabaseData(dbName)
        }

        // Reset modal state
        showDeleteModal.value = false
        deleteState.value.password = ''
        selectedDatabaseId.value = null

        // Reload databases list
        await loadDatabases()
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message || ''
    }
}
</script>

