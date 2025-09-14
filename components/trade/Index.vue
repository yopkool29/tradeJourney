<template>
    <div class="container mx-auto px-4 py-8">
        <div class="flex items-center mb-6 gap-x-4">
            <h1 class="text-2xl font-bold dark:text-white">{{ $t('components.trade.index.title') }}</h1>
            <div class="flex gap-4">
                <UButton color="primary" icon="i-heroicons-pencil-square" @click="onAddTrade"> {{ $t('components.trade.index.button') }} </UButton>
            </div>
        </div>

        <TradeFormModal
            :open="showAdd"
            :trade="editingTrade"
            @update:open="showAdd = $event"
            @saved="
                () => {
                    onSaveTrade()
                }
            "
        />
        <UCard class="mb-8">
            <TradeTable ref="tradeTableRef" :key="refreshKey" @edit="onEdit" @delete="onDeleteRow" />
        </UCard>
    </div>
</template>

<script setup lang="ts">
import { TradeFormModal } from '#components'
import type { TradeType } from '~/schema/trade'

const showAdd = ref(false)
const editingTrade = ref<TradeType | null>(null)
const importMode = ref(false)

const onAddTrade = async () => {
    importMode.value = false
    showAdd.value = true
    editingTrade.value = null
}

const onEdit = async (trade: TradeType) => {
    editingTrade.value = { ...trade }
    showAdd.value = true // On doit montrer le formulaire
}

const onSaveTrade = async () => {
    showAdd.value = false
    importMode.value = false
    editingTrade.value = null
    tradeTableRef.value.applyFilters()
}

const refreshKey = ref(0)
const tradeTableRef = ref()

const onDeleteRow = async (tradeId: number) => {
    // Si le trade supprimé est celui en cours d'édition, on ferme le formulaire
    if (editingTrade.value?.id === tradeId) {
        editingTrade.value = null
        showAdd.value = false
    }
}

</script>
