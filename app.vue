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
</script>
