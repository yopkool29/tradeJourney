<template>
	<div class="space-y-4">
		<div>
			<label class="block text-sm font-medium mb-2">Account Name</label>
			<UIInput v-model="settings.accountName" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Account Full Name</label>
			<UIInput v-model="settings.accountFullname" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Import Name</label>
			<UIInput v-model="settings.importName" size="sm" />
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Symbol</label>
			<UIInput v-model="settings.symbol" size="sm" />
			<p class="text-xs text-muted mt-1">Futures symbol (e.g. MYM, YM, ES, NQ)</p>
		</div>

		<div>
			<div class="flex items-center gap-2 mb-2">
				<input
					id="enable-stop-loss"
					v-model="settings.enableStopLoss"
					type="checkbox"
					class="rounded border-accented"
				/>
				<label for="enable-stop-loss" class="text-sm font-medium">Enable Stop Loss</label>
			</div>

			<div v-if="settings.enableStopLoss" class="space-y-2">
				<div class="flex gap-2">
					<UIInput
						v-model="settings.stopLossPoints"
						type="number"
						size="sm"
						class="flex-1"
						:disabled="settings.autoEstimate"
					/>
					<UIButton
						color="neutral"
						variant="soft"
						size="sm"
						:disabled="!selectedFile || isEstimating || settings.autoEstimate"
						@click="estimateStopLoss"
					>
						{{ isEstimating ? 'Estimating...' : 'Auto-estimate' }}
					</UIButton>
				</div>
				<div class="flex items-center gap-2">
					<input
						id="auto-estimate"
						v-model="settings.autoEstimate"
						type="checkbox"
						class="rounded border-accented"
					/>
					<label for="auto-estimate" class="text-xs font-medium">Auto-estimate at conversion</label>
					<p class="text-xs text-muted">(ignores the field above, uses losing trades average)</p>
				</div>
				<p class="text-xs text-muted mt-1">
					Number of points for stop loss from entry price (e.g. 100 for MYM).
					Click "Auto-estimate" to calculate from losing trades in the selected file.
				</p>
			</div>
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Commission %</label>
			<UIInput v-model="settings.commissionPercent" type="number" size="sm" />
			<p class="text-xs text-muted mt-1">Percentage applied on net profit to approximate commissions</p>
		</div>

		<div>
			<label class="block text-sm font-medium mb-2">Select File</label>
			<UIInput type="file" @change="handleFileSelect" />
			<p v-if="selectedFile" class="mt-2 text-sm text-muted">
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
import { ref } from 'vue'
import UIButton from '../ui/UIButton.vue'
import UIInput from '../ui/UIInput.vue'
import { usePluginSettings } from '../ui/usePluginSettings'

type ConverterSettings = {
	accountName: string
	accountFullname: string
	importName: string
	symbol: string
	enableStopLoss: boolean
	stopLossPoints: string
	autoEstimate: boolean
	commissionPercent: string
}

const settings = usePluginSettings<ConverterSettings>('tradingview-converter', {
	accountName: 'TradingView',
	accountFullname: 'TradingView Trading Account',
	importName: 'TradingView',
	symbol: 'MYM',
	enableStopLoss: false,
	stopLossPoints: '',
	autoEstimate: false,
	commissionPercent: '0',
})

const selectedFile = ref<File | null>(null)
const isConverting = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

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

const estimateStopLoss = async () => {
	if (!selectedFile.value) return

	isEstimating.value = true
	error.value = null

	try {
		const formData = new FormData()
		formData.append('file', selectedFile.value)
		formData.append('conversionType', 'tradingview')
		formData.append('estimateOnly', 'true')

		const response = await fetch('/api/tools/convert', {
			method: 'POST',
			body: formData,
		})

		if (!response.ok) {
			const errData = await response.json().catch(() => null)
			throw new Error(errData?.message || 'Estimation failed')
		}

		const data = await response.json()
		if (data.stopLossPoints) {
			settings.value.stopLossPoints = String(data.stopLossPoints)
		} else {
			throw new Error(data.message || 'Could not estimate stop loss (not enough losing trades)')
		}
	} catch (err: unknown) {
		const e = err as { message?: string }
		error.value = e.message || 'An unknown error occurred'
	} finally {
		isEstimating.value = false
	}
}

const convert = async () => {
	if (!selectedFile.value) return

	isConverting.value = true
	success.value = false
	error.value = null

	try {
		const formData = new FormData()
		formData.append('file', selectedFile.value)
		formData.append('conversionType', 'tradingview')
		formData.append('accountName', settings.value.accountName)
		formData.append('accountFullname', settings.value.accountFullname)
		formData.append('importName', settings.value.importName)
		formData.append('symbol', settings.value.symbol)
		formData.append('commissionPercent', String(settings.value.commissionPercent))
		if (settings.value.enableStopLoss) {
			if (settings.value.autoEstimate) {
				formData.append('autoEstimate', 'true')
			} else if (settings.value.stopLossPoints) {
				formData.append('stopLossPoints', String(settings.value.stopLossPoints))
			}
		}

		const response = await fetch('/api/tools/convert', {
			method: 'POST',
			body: formData,
		})

		if (!response.ok) {
			const errData = await response.json().catch(() => null)
			throw new Error(errData?.message || 'Conversion failed')
		}

		const blob = await response.blob()
		const { downloadBlob } = useTauriDownload()
		await downloadBlob(blob, `${selectedFile.value.name.replace(/\.[^/.]+$/, '')}_converted.csv`)

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
