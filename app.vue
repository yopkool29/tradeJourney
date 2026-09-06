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

// Helper: import dynamique pour éviter que @tauri-apps/api/core soit inclus dans le bundle SSR
// Guard: window.__TAURI_INTERNALS__ n'existe que dans la webview Tauri, pas en navigateur normal
const tauriInvoke = async (cmd: string, args?: Record<string, unknown>) => {
	const w = window as unknown as { __TAURI_INTERNALS__?: unknown }
	if (!w.__TAURI_INTERNALS__) return
	const { invoke } = await import('@tauri-apps/api/core')
	return invoke(cmd, args).catch((e) => console.error(`[app.vue] ${cmd} failed:`, e))
}

// Synchroniser la langue avec Tauri pour les boîtes de dialogue natives
watch(locale, (lang) => {
	console.log('[app.vue] locale changed to:', lang)
	tauriInvoke('set_app_language', { lang })
})

// Fermer le splashscreen Tauri et sync la langue initiale
onMounted(() => {
	tauriInvoke('set_app_language', { lang: locale.value })
	tauriInvoke('close_splashscreen')
})
</script>
