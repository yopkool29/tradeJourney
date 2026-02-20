<template>
    <div>
        <UAlert
            v-if="successStr"
            icon="i-lucide-message-circle-check"
            class="mb-8"
            :description="successStr || ''"
            color="success"
            variant="outline"
        />
        <UAlert
            v-if="errorStr"
            icon="i-lucide-message-circle-warning"
            class="mb-8"
            :description="errorStr || ''"
            color="error"
            variant="outline"
        />
    </div>
</template>

<script setup lang="ts">
defineProps<{
    successStr: string | null
    errorStr: string | null
}>()
</script>
