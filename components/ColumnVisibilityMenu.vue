<template>
    <UDropdownMenu
        class="no-select"
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
interface Props {
    table: any
    labelColumnsHeader: Record<string, string>
    excludeColumns?: string[]
    align?: 'start' | 'end'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    buttonClass?: string
}

const props = withDefaults(defineProps<Props>(), {
    excludeColumns: () => ['actions', 'symbol', 'type', 'profit', 'grossProfit'],
    align: 'end',
    size: 'sm',
    buttonClass: ''
})

const menuItems = computed(() => {
    return props.table?.tableApi
        ?.getAllColumns()
        .filter((column: any) => column.getCanHide() && !props.excludeColumns.includes(column.id))
        .map((column: any) => ({
            label: props.labelColumnsHeader[column.id] as string,
            type: 'checkbox' as const,
            checked: column.getIsVisible(),
            onUpdateChecked(checked: boolean) {
                props.table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
            },
            onSelect(e?: Event) {
                e?.preventDefault()
            },
        })) || []
})
</script>
