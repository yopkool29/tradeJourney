<template>
	<DashboardChartsBreakdownPnlBarChart dimension="tag" :loading="loading" />
</template>

<script setup lang="ts">
// TagPnlBarChart — P&L par tag (setup, erreur, qualité...)
defineProps({
	loading: { type: Boolean },
})
</script>
