<template>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">{{ $t('pages.settings.plugins.title') }}</h2>
				<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ $t('pages.settings.plugins.description') }}</p>
			</div>
			<div class="flex items-center gap-2">
				<input
					ref="fileInput"
					type="file"
					accept=".zip"
					class="hidden"
					@change="handleFileUpload"
				/>
				<UButton
					icon="i-heroicons-arrow-up-tray"
					color="primary"
					variant="soft"
					size="sm"
					:loading="importing"
					@click="fileInput?.click()"
				>
					{{ $t('pages.settings.plugins.import') }}
				</UButton>
				<UButton icon="i-heroicons-arrow-path" color="neutral" variant="ghost" size="sm" :loading="loading" @click="refresh">
					{{ $t('common.actions.reset') }}
				</UButton>
			</div>
		</div>

		<div v-if="loading" class="flex justify-center py-12">
			<UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
		</div>

		<UAlert v-else-if="error" color="error" variant="soft" icon="i-heroicons-exclamation-triangle" :title="$t('pages.settings.plugins.load_error')" />

		<div v-else-if="!plugins.length" class="text-center py-12 text-gray-400 dark:text-gray-500">
			<UIcon name="i-heroicons-puzzle-piece" class="text-4xl mb-2" />
			<p>{{ $t('pages.settings.plugins.empty') }}</p>
			<p class="text-xs mt-1">{{ $t('pages.settings.plugins.empty_hint') }}</p>
		</div>

		<div v-else class="space-y-3">
			<UCard v-for="plugin in plugins" :key="plugin.id" class="p-0">
				<div class="flex items-center justify-between p-4">
					<div class="flex items-center gap-3">
						<UIcon name="i-heroicons-puzzle-piece" class="text-xl text-primary-500" />
						<div>
							<div class="font-medium">{{ plugin.name }}</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ plugin.description }}</div>
							<UBadge :label="`v${plugin.version}`" color="neutral" variant="soft" size="xs" class="mt-1" />
						</div>
					</div>
					<div class="flex items-center gap-2">
						<template v-if="isEnabled(plugin.id)">
							<UButton
								icon="i-heroicons-play"
								color="primary"
								variant="soft"
								size="sm"
								@click="runPlugin(plugin.id)"
							/>
							<UButton
								icon="i-heroicons-arrow-path"
								color="neutral"
								variant="ghost"
								size="sm"
								title="Reload plugin"
								@click="reloadPlugin(plugin.id)"
							/>
						</template>
						<USwitch
							:model-value="isEnabled(plugin.id)"
							:loading="toggling === plugin.id"
							@update:model-value="toggle(plugin.id, $event)"
						/>
					</div>
				</div>
			</UCard>
		</div>
	</div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { success: toastSuccess, error: toastError } = useAppToast()

const fileInput = ref<HTMLInputElement>()

const {
	plugins,
	activePluginIds,
	loading,
	error,
	toggling,
	isEnabled,
	fetchPlugins,
	togglePlugin,
} = usePlugins()

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

const toggle = async (id: string, enabled: boolean) => {
	try {
		await togglePlugin(id, enabled)
		toastSuccess(enabled ? t('pages.settings.plugins.enabled') : t('pages.settings.plugins.disabled'))
		// Load plugin dynamically without reload
		if (enabled) {
			window.dispatchEvent(new CustomEvent('tj-plugin-load', { detail: { pluginId: id } }))
		}
	} catch {
		toastError(t('pages.settings.plugins.toggle_error'))
	}
}

const runPlugin = (id: string) => {
	const actions = (window as { __TJ_PLUGIN_ACTIONS__?: { id: string; run: () => void }[] }).__TJ_PLUGIN_ACTIONS__
	const action = actions?.find(a => a.id.startsWith(id))
	if (action) {
		action.run()
	} else {
		toastError('No action available for this plugin')
	}
}

const reloadPlugin = (id: string) => {
	window.dispatchEvent(new CustomEvent('tj-plugin-load', { detail: { pluginId: id } }))
	toastSuccess('Plugin reloaded')
}

onMounted(fetchPlugins)
</script>
