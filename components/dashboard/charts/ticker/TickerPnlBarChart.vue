<template>
	<DashboardChartsBreakdownPnlBarChart dimension="ticker" :loading="loading" />
</template>

<script setup lang="ts">
// TickerPnlBarChart — wrapper autour du générique BreakdownPnlBarChart
defineProps({
	loading: { type: Boolean },
})
</script>
