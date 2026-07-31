<template>
    <UDropdownMenu
        class="select-none"
        :class="align === 'start' ? 'flex justify-start' : 'flex justify-end'"
        :items="menuItems"
        :content="{ align }"
    >
        <UButton
            :class="buttonClass"
            :label="$t('components.common.columns.button')"
            color="neutral"
            :size="size"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
            class="justify-between"
        />
    </UDropdownMenu>
</template>

<script setup lang="ts">
type TableColumn = {
    id: string
    getCanHide: () => boolean
    getIsVisible: () => boolean
    toggleVisibility: (visible: boolean) => void
}

type TableApi = {
    getAllColumns: () => TableColumn[]
    getColumn: (id: string) => TableColumn | undefined
}

type Table = {
    tableApi?: TableApi
}

interface Props {
    table?: Table | null
    labelColumnsHeader: Record<string, string>
    excludeColumns?: string[]
    align?: 'start' | 'end'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    buttonClass?: string
}

const props = withDefaults(defineProps<Props>(), {
    table: null,
    excludeColumns: () => ['actions', 'symbol', 'type', 'profit', 'grossProfit'],
    align: 'end',
    size: 'sm',
    buttonClass: '',
})

const menuItems = computed(() => props.table?.tableApi
    ?.getAllColumns()
    .filter(column => column.getCanHide() && !props.excludeColumns.includes(column.id))
    .map(column => ({
        label: props.labelColumnsHeader[column.id] as string,
        type: 'checkbox' as const,
        checked: column.getIsVisible(),
        onUpdateChecked: (checked: boolean) => props.table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked),
        onSelect: (event?: Event) => event?.preventDefault(),
    })) || [])
</script>
