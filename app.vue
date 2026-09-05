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

// Synchroniser la langue avec Tauri pour les boîtes de dialogue natives
watch(locale, (lang) => {
    if (window.__TAURI__) {
        const { invoke } = window.__TAURI__.core
        invoke('set_app_language', { lang })
    }
})

// Fermer le splashscreen Tauri et sync la langue initiale quand le DOM est pret
onMounted(() => {
    if (window.__TAURI__) {
        const { invoke } = window.__TAURI__.core
        invoke('set_app_language', { lang: locale.value })
        invoke('close_splashscreen')
    }
})
</script>
