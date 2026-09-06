<template>
    <div class="container mx-auto px-4 py-8 max-w-3xl">
        <!-- Bouton Retour -->
        <div class="mb-4">
            <UButton :label="$t('pages.backup_restore.back')" icon="i-heroicons-arrow-left" color="primary" variant="link"
                @click="navigateTo('/select-database')" />
        </div>

        <h1 class="text-2xl font-bold mb-6">{{ $t('pages.backup_restore.title') }}</h1>

        <UTabs v-model="activeTab" :items="tabItems" class="w-full" />

        <div class="mt-6">
            <!-- Onglet Export -->
            <div v-if="activeTab === 'export'">
                <UCard>
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-archive" class="w-5 h-5 text-primary" />
                            <h3 class="section-title-semibold">{{ $t('pages.backup_restore.export_section') }}</h3>
                        </div>
                        <p class="description-text">{{ $t('pages.backup_restore.export_description') }}</p>
                    </template>

                    <!-- Warning si pas de répertoire configuré -->
                    <UAlert
                        v-if="!backupSettings.backupDir"
                        color="warning"
                        variant="soft"
                        icon="i-heroicons-exclamation-triangle"
                        :title="$t('pages.backup_restore.no_backup_dir')"
                        :description="$t('pages.backup_restore.no_backup_dir_desc')"
                        class="mb-4"
                        :actions="[{ label: $t('pages.backup_restore.settings_tab'), color: 'warning', onClick: () => activeTab = 'settings' }]"
                    />

                    <!-- Répertoire configuré -->
                    <div v-if="backupSettings.backupDir" class="mb-4 p-3 rounded-lg bg-elevated text-sm">
                        <UIcon name="i-heroicons-folder" class="w-4 h-4 mr-1 inline text-primary" />
                        <span class="text-muted">{{ $t('pages.backup_restore.backup_dir') }}:</span>
                        <span class="font-mono ml-1">{{ backupSettings.backupDir }}</span>
                    </div>

                    <!-- Liste des DB -->
                    <div v-if="databases.length > 0" class="space-y-2 mb-4">
                        <div class="flex justify-end gap-2 mb-2">
                            <UButton
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                @click="selectAll(databases.map(d => d.id))"
                            >
                                {{ $t('common.actions.select_all') }}
                            </UButton>
                            <UButton
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                @click="clearSelection()"
                            >
                                {{ $t('common.actions.deselect_all') }}
                            </UButton>
                        </div>
                        <div
                            v-for="db in databases"
                            :key="db.id"
                            class="flex items-center gap-3 p-3 rounded-lg border border-default cursor-pointer hover:bg-elevated transition-colors"
                            @click="toggleDb(db.id)"
                        >
                            <UCheckbox :model-value="selectedDbIds.includes(db.id)" />
                            <UIcon name="i-heroicons-circle-stack" class="text-xl text-primary" />
                            <div class="flex-1">
                                <div class="font-medium">{{ db.displayName }}</div>
                                <div class="text-sm text-muted">{{ db.name }}</div>
                            </div>
                            <UBadge v-if="db.isDefault" color="primary" variant="subtle">
                                {{ $t('pages.select_database.default') }}
                            </UBadge>
                        </div>
                    </div>
                    <UAlert
                        v-else
                        :title="$t('pages.backup_restore.no_databases')"
                        icon="i-heroicons-inbox"
                        color="neutral"
                        variant="soft"
                    />

                    <!-- Progression export -->
                    <div v-if="exportProgress.total > 0" class="mb-4">
                        <div class="flex items-center gap-2 mb-2">
                            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-primary" />
                            <span class="text-sm">
                                {{ $t('pages.backup_restore.export_progress', { current: exportProgress.current, total: exportProgress.total }) }}
                            </span>
                        </div>
                        <UProgress :model-value="exportProgress.current" :max="exportProgress.total" />
                    </div>

                    <!-- Résultats export -->
                    <div v-if="exportResults.length > 0" class="space-y-2 mb-4">
                        <div
                            v-for="result in exportResults"
                            :key="result.dbName"
                            class="flex items-center gap-2 text-sm"
                        >
                            <UIcon
                                :name="result.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                                :class="result.success ? 'text-success' : 'text-error'"
                            />
                            <span class="flex-1">{{ result.displayName || result.dbName }}</span>
                            <span v-if="result.success && result.filename" class="text-muted text-xs">{{ result.filename }}</span>
                            <span v-if="!result.success" class="text-error text-xs">{{ result.error }}</span>
                        </div>
                    </div>

                    <UButton
                        :loading="isExporting"
                        :disabled="isExporting || selectedDbIds.length === 0 || !backupSettings.backupDir"
                        color="primary"
                        icon="i-lucide-download"
                        @click="onExport"
                    >
                        {{ $t('pages.backup_restore.export_button') }}
                    </UButton>
                </UCard>
            </div>

            <!-- Onglet Import -->
            <div v-else-if="activeTab === 'import'">
                <UCard>
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-archive-restore" class="w-5 h-5 text-primary" />
                            <h3 class="section-title-semibold">{{ $t('pages.backup_restore.import_section') }}</h3>
                        </div>
                        <p class="description-text">{{ $t('pages.backup_restore.import_description') }}</p>
                    </template>

                    <!-- Warning si pas de répertoire configuré -->
                    <UAlert
                        v-if="!backupSettings.backupDir"
                        color="warning"
                        variant="soft"
                        icon="i-heroicons-exclamation-triangle"
                        :title="$t('pages.backup_restore.no_backup_dir')"
                        :description="$t('pages.backup_restore.no_backup_dir_desc')"
                        class="mb-4"
                        :actions="[{ label: $t('pages.backup_restore.settings_tab'), color: 'warning', onClick: () => activeTab = 'settings' }]"
                    />

                    <!-- Répertoire configuré -->
                    <div v-if="backupSettings.backupDir" class="mb-4 p-3 rounded-lg bg-elevated text-sm">
                        <UIcon name="i-heroicons-folder" class="w-4 h-4 mr-1 inline text-primary" />
                        <span class="text-muted">{{ $t('pages.backup_restore.backup_dir') }}:</span>
                        <span class="font-mono ml-1">{{ backupSettings.backupDir }}</span>
                    </div>

                    <div v-if="backupSettings.backupDir" class="space-y-4">
                        <!-- Bouton scanner -->
                        <UButton
                            variant="outline"
                            icon="i-heroicons-magnifying-glass"
                            :loading="isScanning"
                            :disabled="isScanning || isImporting"
                            @click="scanBackupDir"
                        >
                            {{ $t('pages.backup_restore.import_scan') }}
                        </UButton>

                        <!-- Liste des zips trouvés -->
                        <div v-if="zipFiles.length > 0" class="space-y-2">
                            <div
                                v-for="file in zipFiles"
                                :key="file.filename"
                                class="flex items-center gap-3 p-3 rounded-lg border border-default cursor-pointer hover:bg-elevated transition-colors"
                                @click="toggleZipFile(file.filename)"
                            >
                                <UCheckbox :model-value="selectedZipFiles.includes(file.filename)" />
                                <UIcon name="i-lucide-file-archive" class="text-xl text-primary" />
                                <div class="flex-1">
                                    <div class="font-medium text-sm">{{ file.filename }}</div>
                                    <div class="text-xs text-muted">
                                        {{ formatToReadableSize(file.size) }}
                                        <span v-if="file.dbName"> — {{ file.dbName }}</span>
                                    </div>
                                </div>
                                <UBadge
                                    v-if="file.dbName && databases.some(d => d.name === file.dbName)"
                                    color="warning"
                                    variant="subtle"
                                    :label="$t('pages.backup_restore.import_will_replace')"
                                />
                                <UBadge
                                    v-else-if="file.dbName"
                                    color="info"
                                    variant="subtle"
                                    :label="$t('pages.backup_restore.import_new_db')"
                                />
                            </div>
                        </div>
                        <UAlert
                            v-else-if="hasScanned"
                            :title="$t('pages.backup_restore.no_zip_files')"
                            icon="i-heroicons-inbox"
                            color="neutral"
                            variant="soft"
                        />

                        <!-- Progression import -->
                        <div v-if="importProgress.total > 0">
                            <div class="flex items-center gap-2 mb-2">
                                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-primary" />
                                <span class="text-sm">
                                    {{ $t('pages.backup_restore.import_progress', { current: importProgress.current, total: importProgress.total }) }}
                                </span>
                            </div>
                            <UProgress :model-value="importProgress.current" :max="importProgress.total" />
                        </div>

                        <!-- Résultats import -->
                        <div v-if="importResults.length > 0" class="space-y-2">
                            <div
                                v-for="result in importResults"
                                :key="result.filename"
                                class="flex items-center gap-2 text-sm"
                            >
                                <UIcon
                                    :name="result.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                                    :class="result.success ? 'text-success' : 'text-error'"
                                />
                                <span class="flex-1">{{ result.dbName }}</span>
                                <span v-if="!result.success" class="text-error text-xs">{{ result.error }}</span>
                            </div>
                        </div>

                        <!-- Bouton restaurer -->
                        <div class="flex gap-3" v-if="selectedZipFiles.length > 0">
                            <UButton
                                :loading="isImporting"
                                :disabled="isImporting"
                                color="error"
                                icon="i-lucide-archive-restore"
                                @click="showConfirmModal = true"
                            >
                                {{ $t('pages.backup_restore.import_button') }}
                            </UButton>
                            <UButton variant="soft" color="neutral" :disabled="isImporting" @click="selectedZipFiles = []">
                                {{ $t('common.actions.cancel') }}
                            </UButton>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Onglet Settings -->
            <div v-else-if="activeTab === 'settings'">
                <UCard>
                    <template #header>
                        <div class="flex items-center gap-2">
                            <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 text-primary" />
                            <h3 class="section-title-semibold">{{ $t('pages.backup_restore.settings_section') }}</h3>
                        </div>
                        <p class="description-text">{{ $t('pages.backup_restore.settings_description') }}</p>
                    </template>

                    <div class="space-y-6">
                        <!-- Backup directory -->
                        <div>
                            <label class="block text-sm font-medium mb-2">{{ $t('pages.backup_restore.backup_dir') }}</label>
                            <div class="flex gap-2">
                                <UInput
                                    v-model="backupDirInput"
                                    :placeholder="$t('pages.backup_restore.backup_dir_placeholder')"
                                    class="flex-1"
                                    :readonly="isTauri"
                                />
                                <UButton
                                    v-if="isTauri"
                                    variant="outline"
                                    icon="i-heroicons-folder-open"
                                    @click="pickBackupDir"
                                >
                                    {{ $t('pages.backup_restore.browse') }}
                                </UButton>
                            </div>
                            <p class="text-xs text-muted mt-1">{{ $t('pages.backup_restore.backup_dir_help') }}</p>
                        </div>

                        <!-- Bouton sauvegarder -->
                        <UButton
                            :loading="isSavingSettings"
                            :disabled="isSavingSettings"
                            color="primary"
                            icon="i-heroicons-check"
                            @click="saveSettings"
                        >
                            {{ $t('common.actions.save') }}
                        </UButton>
                    </div>
                </UCard>
            </div>
        </div>

        <!-- Modal de confirmation import -->
        <CommonModalDefault v-model:open="showConfirmModal" :title="$t('pages.backup_restore.import_confirm_title')">
            <template #content>
                <p class="mb-4">{{ $t('pages.backup_restore.import_confirm_message') }}</p>
                <div v-if="replaceCount > 0" class="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                    <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 mr-1 inline" />
                    {{ $t('pages.backup_restore.import_replace_warning', { count: replaceCount }) }}
                </div>
            </template>
            <template #footer>
                <div class="action-buttons-end">
                    <UButton
                        color="error"
                        variant="solid"
                        :loading="isImporting"
                        :disabled="isImporting"
                        @click="onImport"
                    >
                        {{ $t('pages.backup_restore.import_button') }}
                    </UButton>
                    <UButton variant="ghost" :disabled="isImporting" @click="showConfirmModal = false">
                        {{ $t('common.actions.cancel') }}
                    </UButton>
                </div>
            </template>
        </CommonModalDefault>
    </div>
</template>

<script setup lang="ts">
import { formatToReadableSize } from '~/utils'

interface Database {
	id: number
	name: string
	displayName: string
	isDefault: boolean
}

interface ZipEntry {
	filename: string
	size: number
	dbName: string | null
}

const { t } = useI18n()
const { success: toastSuccess, error: toastError } = useAppToast()
const { fetchDatabases, databases } = useDatabase()
const backupStore = useBackupStore()
const { selectedDbIds } = storeToRefs(backupStore)
const { toggleDb, selectAll, clearSelection } = backupStore

// --- Onglets ---
const activeTab = ref<'export' | 'import' | 'settings'>('export')
const tabItems = computed(() => [
	{ label: t('pages.backup_restore.export_section'), value: 'export' as const, icon: 'i-lucide-archive' },
	{ label: t('pages.backup_restore.import_section'), value: 'import' as const, icon: 'i-lucide-archive-restore' },
	{ label: t('pages.backup_restore.settings_section'), value: 'settings' as const, icon: 'i-heroicons-cog-6-tooth' },
])

// --- Settings ---
const backupSettings = ref({ backupDir: '' })
const backupDirInput = ref('')
const isSavingSettings = ref(false)

const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__

const pickDirectory = async (): Promise<string | null> => {
	if (!isTauri) return null
	const { open } = await import('@tauri-apps/plugin-dialog')
	const selected = await open({ directory: true, multiple: false })
	return typeof selected === 'string' ? selected : null
}

const pickBackupDir = async () => {
	const dir = await pickDirectory()
	if (dir) backupDirInput.value = dir
}

const fetchSettings = async () => {
	try {
		const settings = await $fetch<{ backupDir: string }>('/api/backup/settings')
		backupSettings.value = settings
		backupDirInput.value = settings.backupDir
	} catch (error) {
		console.error('Failed to fetch backup settings:', error)
	}
}

const saveSettings = async () => {
	isSavingSettings.value = true
	try {
		const settings = await $fetch<{ backupDir: string }>('/api/backup/settings', {
			method: 'PATCH',
			body: { backupDir: backupDirInput.value },
		})
		backupSettings.value = settings
		toastSuccess(t('pages.backup_restore.settings_saved'))
	} catch (error) {
		console.error('Failed to save backup settings:', error)
		toastError(t('common.title.error'), t('pages.backup_restore.settings_save_error'))
	} finally {
		isSavingSettings.value = false
	}
}

// --- Export ---
const isExporting = ref(false)
const exportProgress = ref({ current: 0, total: 0 })
const exportResults = ref<{ dbName: string; displayName: string; success: boolean; filename?: string; error?: string }[]>([])

const onExport = async () => {
	isExporting.value = true
	exportResults.value = []
	exportProgress.value = { current: 0, total: selectedDbIds.value.length }

	try {
		const selectedNames = databases.value
			.filter(d => selectedDbIds.value.includes(d.id))
			.map(d => d.name)
			.join(',')

		type ExportResponse = {
			success: boolean
			backups: { dbName: string; displayName: string; success: boolean; filename?: string; error?: string }[]
			backupDir: string
			summary: { total: number; succeeded: number; failed: number }
		}

		const response = await $fetch<ExportResponse>(`/api/backup/all?dbNames=${encodeURIComponent(selectedNames)}`)

		for (const backup of response.backups) {
			exportProgress.value.current++
			exportResults.value.push({
				dbName: backup.dbName,
				displayName: backup.displayName,
				success: backup.success,
				filename: backup.filename,
				error: backup.error,
			})
		}

		const succeeded = exportResults.value.filter(r => r.success).length
		const failed = exportResults.value.filter(r => !r.success).length

		if (failed === 0) {
			toastSuccess(t('pages.backup_restore.export_success', { count: succeeded }))
		} else if (succeeded > 0) {
			toastSuccess(t('pages.backup_restore.export_partial', { success: succeeded, total: exportResults.value.length }))
		} else {
			toastError(t('common.title.error'), t('pages.backup_restore.export_failed'))
		}
	} catch (error) {
		console.error('Export all failed:', error)
		toastError(t('common.title.error'), t('pages.backup_restore.export_failed'))
	} finally {
		isExporting.value = false
		exportProgress.value = { current: 0, total: 0 }
	}
}

// --- Import ---
const zipFiles = ref<ZipEntry[]>([])
const selectedZipFiles = ref<string[]>([])
const isScanning = ref(false)
const hasScanned = ref(false)
const isImporting = ref(false)
const showConfirmModal = ref(false)
const importProgress = ref({ current: 0, total: 0 })
const importResults = ref<{ dbName: string; filename: string; success: boolean; error?: string }[]>([])

const replaceCount = computed(() => {
	return selectedZipFiles.value.filter(f => {
		const zip = zipFiles.value.find(z => z.filename === f)
		return zip?.dbName && databases.value.some(d => d.name === zip.dbName)
	}).length
})

const scanBackupDir = async () => {
	isScanning.value = true
	try {
		const response = await $fetch<{ files: ZipEntry[] }>('/api/backup/list-dir')
		zipFiles.value = response.files
		hasScanned.value = true
		selectedZipFiles.value = []
	} catch (error) {
		console.error('Failed to scan backup dir:', error)
		toastError(t('common.title.error'), t('pages.backup_restore.import_scan_error'))
	} finally {
		isScanning.value = false
	}
}

const toggleZipFile = (filename: string) => {
	const idx = selectedZipFiles.value.indexOf(filename)
	if (idx >= 0) {
		selectedZipFiles.value.splice(idx, 1)
	} else {
		selectedZipFiles.value.push(filename)
	}
}

const onImport = async () => {
	showConfirmModal.value = false
	isImporting.value = true
	importResults.value = []
	importProgress.value = { current: 0, total: selectedZipFiles.value.length }

	try {
		type ImportResponse = {
			success: boolean
			results: { dbName: string; filename: string; success: boolean; error?: string }[]
			summary: { total: number; succeeded: number; failed: number }
		}

		const response = await $fetch<ImportResponse>('/api/backup/all', {
			method: 'POST',
			body: { files: selectedZipFiles.value },
		})

		importResults.value = response.results
		importProgress.value.current = response.results.length

		const succeeded = response.summary.succeeded
		const failed = response.summary.failed

		if (failed === 0) {
			toastSuccess(t('pages.backup_restore.import_success', { count: succeeded }))
		} else if (succeeded > 0) {
			toastSuccess(t('pages.backup_restore.import_partial', { success: succeeded, total: response.summary.total }))
		} else {
			toastError(t('common.title.error'), t('pages.backup_restore.import_failed'))
		}

		// Recharger la liste des DB et rescanner le répertoire
		await fetchDatabases()
		await scanBackupDir()
	} catch (error) {
		console.error('Import all failed:', error)
		toastError(t('common.title.error'), t('pages.backup_restore.import_failed'))
	} finally {
		isImporting.value = false
		importProgress.value = { current: 0, total: 0 }
	}
}

// --- Init ---
onMounted(async () => {
	await Promise.all([
		fetchDatabases(),
		fetchSettings(),
	])
})
</script>
