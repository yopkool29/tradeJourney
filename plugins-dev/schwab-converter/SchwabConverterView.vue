<template>
	<div class="space-y-4">
		<div>
			<label class="block text-sm font-medium mb-2">Account Name</label>
			<UIInput v-model="params.accountName" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Account Full Name</label>
			<UIInput v-model="params.accountFullname" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Import Name</label>
			<UIInput v-model="params.importName" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Select File</label>
			<UIInput type="file" @change="handleFileSelect" />
			<p v-if="selectedFile" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
				Selected: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
			</p>
		</div>

		<div class="flex gap-2">
			<UIButton
				color="primary"
				:disabled="!selectedFile || isConverting"
				@click="convert"
			>
				{{ isConverting ? 'Converting...' : 'Convert' }}
			</UIButton>
			<UIButton
				v-if="selectedFile"
				color="red"
				variant="ghost"
				@click="clearFile"
			>
				Remove
			</UIButton>
		</div>

		<div v-if="success" class="p-3 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
			Conversion successful! Download will start automatically.
		</div>

		<div v-if="error" class="p-3 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
			{{ error }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import UIButton from '../ui/UIButton.vue'
import UIInput from '../ui/UIInput.vue'

const selectedFile = ref<File | null>(null)
const isConverting = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

const params = reactive({
	accountName: 'Schwab',
	accountFullname: 'Charles Schwab Options',
	importName: 'SchwabOptions',
})

const handleFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement
	if (target.files && target.files.length > 0) {
		selectedFile.value = target.files[0]
		success.value = false
		error.value = null
	}
}

const clearFile = () => {
	selectedFile.value = null
	success.value = false
	error.value = null
}

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const convert = async () => {
	if (!selectedFile.value) return

	isConverting.value = true
	success.value = false
	error.value = null

	try {
		const formData = new FormData()
		formData.append('file', selectedFile.value)
		formData.append('conversionType', 'schwab-options')
		formData.append('accountName', params.accountName)
		formData.append('accountFullname', params.accountFullname)
		formData.append('importName', params.importName)

		const response = await fetch('/api/tools/convert', {
			method: 'POST',
			body: formData,
		})

		if (!response.ok) {
			const errData = await response.json().catch(() => null)
			throw new Error(errData?.message || 'Conversion failed')
		}

		const blob = await response.blob()
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${selectedFile.value.name.replace(/\.[^/.]+$/, '')}_converted.csv`
		document.body.appendChild(a)
		a.click()
		window.URL.revokeObjectURL(url)
		document.body.removeChild(a)

		success.value = true
		selectedFile.value = null
	} catch (err: unknown) {
		const e = err as { message?: string }
		error.value = e.message || 'An unknown error occurred'
	} finally {
		isConverting.value = false
	}
}
</script>
