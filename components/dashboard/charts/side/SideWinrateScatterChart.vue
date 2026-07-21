<template>
	<DashboardChartsBreakdownWinrateScatterChart dimension="side" :loading="loading" />
</template>

<script setup lang="ts">
// SideWinrateScatterChart — Winrate vs Trades Long vs Short
defineProps({
	loading: { type: Boolean },
})
</script>
