<template>
	<DashboardChartsBreakdownWinrateScatterChart dimension="tag" :loading="loading" />
</template>

<script setup lang="ts">
// TagWinrateScatterChart — Winrate vs Trades par tag
defineProps({
	loading: { type: Boolean },
})
</script>
