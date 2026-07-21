<template>
	<DashboardChartsBreakdownPnlBarChart dimension="side" :loading="loading" />
</template>

<script setup lang="ts">
// SidePnlBarChart — P&L Long vs Short
defineProps({
	loading: { type: Boolean },
})
</script>
