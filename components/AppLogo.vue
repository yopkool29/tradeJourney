<template>
    <div class="app-logo">
        <img v-if="!isDark" src="/img/logo.svg" alt="PnlTracker Logo" :width="width" :height="height" />
        <img v-else src="/img/logo-dark.svg" alt="PnlTracker Logo" :width="width" :height="height" />
    </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()

defineProps({
    width: {
        type: [Number, String],
        default: 200,
    },
    height: {
        type: [Number, String],
        default: 60,
    },
})
</script>

<style scoped>
.app-logo {
    display: inline-block;
}
</style>
