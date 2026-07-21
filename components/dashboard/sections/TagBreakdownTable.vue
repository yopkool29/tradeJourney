<template>
	<DashboardSectionsBreakdownTable dimension="tag" :loading="loading" />
</template>

<script setup lang="ts">
// TagBreakdownTable — breakdown par tag (setup, stratégie, erreur, qualité...)
// Un trade avec plusieurs tags apparaît dans chaque groupe (overlap)
defineProps<{
	loading?: boolean
}>()
</script>
