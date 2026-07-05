<template>
	<div class="space-y-4">
		<div v-if="loading" class="flex justify-center py-6">
			<div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
		</div>

		<div v-else-if="error" class="text-red-500 text-sm">
			{{ error }}
		</div>

		<template v-else>
			<!-- Account selection -->
			<div>
				<label class="block text-sm font-medium mb-2">Compte</label>
				<select
					v-model="selectedAccountId"
					class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
				>
					<option :value="null" disabled>-- Sélectionner un compte --</option>
					<option v-for="account in accounts" :key="account.id" :value="account.id">
						{{ account.name }}
					</option>
				</select>
			</div>

			<!-- Instrument type selection -->
			<div>
				<label class="block text-sm font-medium mb-2">Type d'instrument</label>
				<select
					v-model="selectedInstrumentType"
					class="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
				>
					<option v-for="opt in instrumentTypeOptions" :key="opt.value" :value="opt.value">
						{{ opt.label }}
					</option>
				</select>
			</div>

			<!-- Trade count info -->
			<div v-if="selectedAccountId !== null" class="text-sm text-gray-500 dark:text-gray-400">
				<span v-if="countLoading">Comptage des trades...</span>
				<span v-else>{{ tradeCount }} trade(s) seront mis à jour</span>
			</div>

			<!-- Apply button -->
			<div class="flex gap-2">
				<UIButton
					color="primary"
					:disabled="selectedAccountId === null || applying"
					@click="apply"
				>
					{{ applying ? 'Application...' : 'Appliquer' }}
				</UIButton>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import UIButton from '../ui/UIButton.vue'
import type { TJPluginSdk } from '~/type/plugin'

// InstrumentType enum duplicated from ~/type because plugins can't
// import ~/type (not resolvable by the plugin vite config).
// See ~/type/index.ts for the source.
enum InstrumentType {
	Stock = 'stock',
	Future = 'future',
	Forex = 'forex',
	Option = 'option',
	Crypto = 'crypto',
	Any = 'any',
}

type Account = {
	id: number
	name: string
}

type BatchUpdateResponse = {
	count: number
}

const props = defineProps<{ sdk: TJPluginSdk }>()

const accounts = ref<Account[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const selectedAccountId = ref<number | null>(null)
const selectedInstrumentType = ref<InstrumentType>(InstrumentType.Any)

const tradeCount = ref(0)
const countLoading = ref(false)
const applying = ref(false)

const instrumentTypeOptions = [
	{ value: InstrumentType.Stock, label: 'Stock' },
	{ value: InstrumentType.Future, label: 'Future' },
	{ value: InstrumentType.Forex, label: 'Forex' },
	{ value: InstrumentType.Crypto, label: 'Crypto' },
	{ value: InstrumentType.Option, label: 'Option' },
	{ value: InstrumentType.Any, label: 'Any' },
]

const fetchTradeCount = async () => {
	if (selectedAccountId.value === null) {
		tradeCount.value = 0
		return
	}

	countLoading.value = true
	try {
		const filters = JSON.stringify([
			{ column: 'accountId', operator: '=', value: selectedAccountId.value },
		])
		const trades = await props.sdk.api.get<unknown[]>(`/api/trades?filters=${encodeURIComponent(filters)}&limit=100000`)
		tradeCount.value = Array.isArray(trades) ? trades.length : 0
	} catch {
		tradeCount.value = 0
	} finally {
		countLoading.value = false
	}
}

watch(selectedAccountId, fetchTradeCount)

const apply = async () => {
	if (selectedAccountId.value === null) return

	applying.value = true
	try {
		const result = await props.sdk.api.post<BatchUpdateResponse>(
			'/api/trades/instrument-type/batch',
			{
				accountId: selectedAccountId.value,
				instrumentType: selectedInstrumentType.value,
			},
		)
		console.log('[instrument-type-fixer] response', result)
		props.sdk.ui.toast.success(`${result.count} trade(s) mis à jour`)
	} catch (err) {
		console.error('[instrument-type-fixer] error', err)
		props.sdk.ui.toast.error('Erreur lors de la mise à jour')
	} finally {
		applying.value = false
	}
}

onMounted(async () => {
	try {
		accounts.value = await props.sdk.api.get<Account[]>('/api/account')
	} catch {
		error.value = 'Impossible de charger les comptes'
	} finally {
		loading.value = false
	}
})
</script>
