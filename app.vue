<template>
    <UApp :locale="locale == 'fr' ? fr : en">
        <NuxtLayout>
            <NuxtPage />
        </NuxtLayout>
    </UApp>
</template>

<script setup lang="ts">
import { fr, en } from '@nuxt/ui/locale'

const { locale } = useI18n()

// Fermer le splashscreen Tauri quand le DOM est pret
onMounted(() => {
    if (window.__TAURI__) {
        const { invoke } = window.__TAURI__.core
        invoke('close_splashscreen')
    }
})
</script>
