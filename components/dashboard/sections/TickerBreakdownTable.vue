<template>
	<DashboardSectionsBreakdownTable dimension="ticker" :loading="loading" />
</template>

<script setup lang="ts">
// TickerBreakdownTable est maintenant un wrapper autour du générique BreakdownTable.vue
// (même pattern de breakdown, juste la dimension qui change)
defineProps<{
	loading?: boolean
}>()
</script>
