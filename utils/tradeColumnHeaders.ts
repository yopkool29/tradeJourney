// Shared column header labels for trade tables.
// Used by Table.vue, TradeGroup.vue, TradeGroupTable.vue, ColumnVisibilityMenu.vue, TradeFilters.vue.
export const getTradeColumnHeaders = () => {
    const { t } = useI18n()

    const labelColumnsHeader = computed(() => ({
        actionToggle: t('components.common.columns.headers.actions'),
        actions: t('components.common.columns.headers.actions'),
        note: t('components.common.columns.headers.note'),
        tags: t('components.common.columns.headers.tags'),
        screenshots: t('components.common.columns.headers.screenshots'),
        symbol: t('components.common.columns.headers.symbol'),
        account: t('components.common.columns.headers.account'),
        type: t('components.common.columns.headers.type'),
        lot: t('components.common.columns.headers.lot'),
        openDate: t('components.common.columns.headers.openHour'),
        closeDate: t('components.common.columns.headers.closeHour'),
        openHour: t('components.common.columns.headers.openHour'),
        closeHour: t('components.common.columns.headers.closeHour'),
        openPrice: t('components.common.columns.headers.openPrice'),
        closePrice: t('components.common.columns.headers.closePrice'),
        profit: t('components.common.columns.headers.profit'),
        grossProfit: t('components.common.columns.headers.grossProfit'),
        commission: t('components.common.columns.headers.commission'),
        stopLoss: t('components.common.columns.headers.stopLoss'),
        takeProfit: t('components.common.columns.headers.takeProfit'),
        riskReward: t('components.common.columns.headers.riskReward'),
        instrumentType: t('components.common.columns.headers.instrumentType'),
    }))

    return { labelColumnsHeader }
}
