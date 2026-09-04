<template>
    <div class="app-logo">
        <img src="/img/logo.svg" alt="PnlTracker Logo" :width="width" :height="height" class="logo-light" />
        <img src="/img/logo-dark.svg" alt="PnlTracker Logo" :width="width" :height="height" class="logo-dark" />
    </div>
</template>

<script setup lang="ts">
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

<style>
.app-logo {
    display: inline-block;
}
.app-logo .logo-dark {
    display: none;
}
html.dark .app-logo .logo-light {
    display: none;
}
html.dark .app-logo .logo-dark {
    display: inline-block;
}
</style>
