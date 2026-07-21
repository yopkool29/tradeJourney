<template>
	<DashboardChartsBreakdownWinrateScatterChart dimension="ticker" :loading="loading" />
</template>

<script setup lang="ts">
// TickerWinrateScatterChart — wrapper autour du générique BreakdownWinrateScatterChart
defineProps({
	loading: { type: Boolean },
})
</script>
