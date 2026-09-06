import { defineStore } from 'pinia'

export const useBackupStore = defineStore(
	'backup',
	() => {
		const selectedDbIds = ref<number[]>([])

		const toggleDb = (id: number) => {
			if (selectedDbIds.value.includes(id)) {
				selectedDbIds.value = selectedDbIds.value.filter(x => x !== id)
			} else {
				selectedDbIds.value = [...selectedDbIds.value, id]
			}
		}

		const selectAll = (ids: number[]) => {
			selectedDbIds.value = [...ids]
		}

		const clearSelection = () => {
			selectedDbIds.value = []
		}

		return {
			selectedDbIds,
			toggleDb,
			selectAll,
			clearSelection,
		}
	},
	{
		persist: {
			storage: import.meta.client ? localStorage : undefined,
			pick: ['selectedDbIds'],
		},
	}
)
