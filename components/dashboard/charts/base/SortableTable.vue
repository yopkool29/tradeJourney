<template>
	<div>
		<UTable
			:data="paginatedData"
			:columns="sortableColumns"
			:loading="loading"
			:empty-state="emptyState"
			:ui="tableUi"
			:class="tableClass"
			@sort="onSort"
		>
			<template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
				<slot :name="name" v-bind="slotData" />
			</template>
		</UTable>

		<div v-if="hasPagination" class="flex justify-center pt-4 pb-2">
			<UPagination
				v-model:page="page"
				:page-count="totalPages"
				:total="sortedData.length"
				:items-per-page="pageSize"
				:ui="paginationUi"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { PropType } from 'vue'

interface SortableColumn {
	accessorKey: string
	header: string
	sortable?: boolean
}

const props = defineProps({
	data: {
		type: Array as PropType<any[]>,
		required: true,
	},
	columns: {
		type: Array as PropType<SortableColumn[]>,
		required: true,
	},
	loading: {
		type: Boolean,
		default: false,
	},
	pageSize: {
		type: Number,
		default: 12,
	},
	emptyState: {
		type: Object as PropType<{ icon: string; label: string }>,
	},
	tableClass: {
		type: String,
	},
	tableUi: {
		type: Object as PropType<Record<string, unknown>>,
		default: () => ({ td: 'p-2' }),
	},
	paginationUi: {
		type: Object as PropType<Record<string, unknown>>,
		default: () => ({
			root: '',
			item: 'min-w-[32px] mx-[5px] !rounded-full justify-center',
		}),
	},
})

const sortBy = ref('')
const sortDesc = ref(false)
const page = ref(1)
const pageSize = computed(() => props.pageSize)

const onSort = ({ column, direction }: { column: { accessorKey: string }; direction: string }) => {
	sortBy.value = column.accessorKey
	sortDesc.value = direction === 'desc'
	page.value = 1
}

const createSortHeader = (key: string, label: string) => {
	const UIconComp = resolveComponent('UIcon')
	return () => h('button', {
		class: 'flex items-center gap-1 select-none',
		onClick: () =>
			onSort({
				column: { accessorKey: key },
				direction: sortBy.value === key && !sortDesc.value ? 'desc' : 'asc',
			}),
	}, [
		label,
		h(UIconComp, {
			name:
				sortBy.value === key
					? sortDesc.value
						? 'i-lucide-arrow-down-wide-narrow'
						: 'i-lucide-arrow-up-narrow-wide'
					: 'i-lucide-arrow-up-down',
			class: 'w-4 h-4 ml-1',
		}),
	])
}

const sortedData = computed(() => {
	if (!sortBy.value) return props.data
	return [...props.data].sort((a, b) => {
		const valA = (a as Record<string, any>)[sortBy.value]
		const valB = (b as Record<string, any>)[sortBy.value]
		if (valA == null) return 1
		if (valB == null) return -1
		if (valA === valB) return 0
		if (typeof valA === 'string' && typeof valB === 'string') {
			return sortDesc.value ? valB.localeCompare(valA) : valA.localeCompare(valB)
		}
		if (sortDesc.value) {
			return (valA as number) < (valB as number) ? 1 : -1
		}
		return (valA as number) > (valB as number) ? 1 : -1
	})
})

const paginatedData = computed(() => {
	const start = (page.value - 1) * pageSize.value
	const end = start + pageSize.value
	return sortedData.value.slice(start, end)
})

const totalPages = computed(() =>
	Math.ceil(sortedData.value.length / pageSize.value)
)

const hasPagination = computed(() =>
	sortedData.value.length > pageSize.value
)

const sortableColumns = computed(() =>
	props.columns.map((col) => ({
		accessorKey: col.accessorKey,
		header: () => createSortHeader(col.accessorKey, col.header)(),
		sortable: col.sortable !== false,
	}))
)
</script>
