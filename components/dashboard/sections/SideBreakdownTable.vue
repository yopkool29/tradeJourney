<template>
	<DashboardSectionsBreakdownTable dimension="side" :loading="loading" />
</template>

<script setup lang="ts">
// SideBreakdownTable — breakdown par direction (Long / Short)
defineProps<{
	loading?: boolean
}>()
</script>
