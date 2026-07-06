<template>
	<SettingsSection
		:title="$t('pages.settings.plugins.title')"
		:show-refresh="true"
		:loading="loading"
		@refresh="refresh"
	>
		<template #actions>
			<input ref="fileInput" type="file" accept=".zip" class="hidden" @change="handleFileUpload" />
			<UButton icon="i-heroicons-arrow-up-tray" color="primary" variant="soft" size="xs"
				:loading="importing" @click="fileInput?.click()">
				{{ $t('pages.settings.plugins.import') }}
			</UButton>
		</template>

		<div v-if="loading" class="flex justify-center py-12">
			<UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
		</div>

		<UAlert v-else-if="error" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
			:title="$t('pages.settings.plugins.load_error')" />

		<div v-else-if="!plugins.length" class="text-center py-12 text-gray-400 dark:text-gray-500">
			<UIcon name="i-heroicons-puzzle-piece" class="text-4xl mb-2" />
			<p>{{ $t('pages.settings.plugins.empty') }}</p>
			<p class="text-xs mt-1">{{ $t('pages.settings.plugins.empty_hint') }}</p>
		</div>

		<div v-else class="space-y-3">
			<UCard v-for="plugin in plugins" :key="plugin.id" class="p-0">
				<div class="flex items-center justify-between px-4 py-0">
					<div class="flex items-center gap-3">
						<UIcon name="i-heroicons-puzzle-piece" class="text-xl text-primary" />
						<div>
							<div class="flex items-center gap-1.5">
								<span class="font-medium">{{ plugin.name }}</span>
								<UIcon v-if="plugin.isDev" name="i-heroicons-bug-beaker" class="text-sm text-yellow-500" title="Dev plugin" />
							</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ plugin.description }}</div>
							<div class="flex items-center gap-1.5 mt-1">
								<UBadge :label="`v${plugin.version}`" color="neutral" variant="soft" size="xs" />
								<UBadge v-if="plugin.isDev" label="DEV" color="warning" variant="soft" size="xs" />
							</div>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<template v-if="isEnabled(plugin.id)">
							<UButton icon="i-heroicons-play" color="primary" variant="soft" size="sm"
								@click="runPlugin(plugin.id)" />
							<UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="sm"
								:loading="reloading === plugin.id"
								title="Reload plugin" @click="reloadPlugin(plugin.id)" />
						</template>
						<USwitch :model-value="isEnabled(plugin.id)" :loading="toggling === plugin.id"
							:disabled="plugin.isDev"
							@update:model-value="togglePluginWithCleanup(plugin.id, $event)" />
						<UButton v-if="plugin.isUploaded && !plugin.isDev" icon="i-heroicons-trash" color="error" variant="ghost"
							size="sm" :loading="deleting === plugin.id" @click="handleDelete(plugin.id)" />
					</div>
				</div>
			</UCard>
		</div>
	</SettingsSection>

	<CommonModalDelete v-model:open="showDeleteModal" @confirm="confirmDelete" @cancel="pluginToDelete = null">
		<template #content>
			<p>{{ $t('pages.settings.plugins.delete_confirm') }}</p>
		</template>
	</CommonModalDelete>
</template>

<script setup lang="ts">
defineEmits(['imported'])

const { t } = useI18n()
const { success: toastSuccess, error: toastError } = useAppToast()

const fileInput = ref<HTMLInputElement>()

const {
	plugins,
	loading,
	error,
	toggling,
	reloading,
	isEnabled,
	fetchPlugins,
	togglePluginWithCleanup,
	deletePlugin,
	runPlugin,
	reloadPlugin,
} = usePlugins()

const deleting = ref<string | null>(null)
const showDeleteModal = ref(false)
const pluginToDelete = ref<string | null>(null)

const importing = ref(false)
const refresh = () => fetchPlugins()

const handleFileUpload = async (event: Event) => {
	const target = event.target as HTMLInputElement
	const file = target.files?.[0]
	if (!file) return

	// Validate file type
	if (!file.name.endsWith('.zip')) {
		toastError(t('pages.settings.plugins.import_error_invalid_type'))
		return
	}

	importing.value = true
	try {
		const formData = new FormData()
		formData.append('file', file)

		await $fetch('/api/plugins/import', {
			method: 'POST',
			body: formData,
		})

		toastSuccess(t('pages.settings.plugins.import_success'))
		await fetchPlugins()
	} catch {
		toastError(t('pages.settings.plugins.import_error'))
	} finally {
		importing.value = false
		// Reset input
		if (fileInput.value) {
			fileInput.value.value = ''
		}
	}
}

const handleDelete = (id: string) => {
	pluginToDelete.value = id
	showDeleteModal.value = true
}

const confirmDelete = async () => {
	const id = pluginToDelete.value
	if (!id) return
	deleting.value = id
	try {
		await deletePlugin(id)
		toastSuccess(t('pages.settings.plugins.delete_success'))
	} catch {
		toastError(t('pages.settings.plugins.delete_error'))
	} finally {
		deleting.value = null
		pluginToDelete.value = null
	}
}

onMounted(fetchPlugins)
</script>
