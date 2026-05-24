<template>
    <div class="container mx-auto px-4 py-8">
        <div class="mb-4">
            <UButton :label="$t('common.actions.back')" icon="i-heroicons-arrow-left" color="primary" variant="link" @click="goBack" />
        </div>
        <h1 class="text-2xl font-bold">{{ $t('pages.legal.terms.title') }}</h1>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'legal' })
const { goBack } = useQuickNav()
</script>
