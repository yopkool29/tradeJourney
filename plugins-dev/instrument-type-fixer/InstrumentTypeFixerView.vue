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
				<UISelect
					v-model="selectedAccountId"
					:options="accountOptions"
					placeholder="-- Sélectionner un compte --"
				/>
			</div>

			<!-- Instrument type selection -->
			<div>
				<label class="block text-sm font-medium mb-2">Type d'instrument</label>
				<UISelect
					v-model="selectedInstrumentType"
					:options="instrumentTypeOptions"
				/>
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

			<div v-if="successMessage" class="p-3 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
				{{ successMessage }}
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import UIButton from '../ui/UIButton.vue'
import UISelect from '../ui/UISelect.vue'
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
const successMessage = ref('')

const accountOptions = computed(() => accounts.value.map(a => ({ value: a.id, label: a.name })))

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
		successMessage.value = `${result.count} trade(s) mis à jour avec succès`
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
