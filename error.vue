<template>
    <div class="flex-1 flex items-center justify-center min-h-screen">
        <div class="max-w-md w-full text-center p-4">
            <div>
                <h1 class="text-9xl font-extrabold text-gray-400">{{ error?.statusCode || '404' }}</h1>
                <h2 class="mt-6 text-3xl font-bold text-gray-900">
                    {{ error?.statusMessage || 'Page non trouvée' }}
                </h2>
                <p class="mt-2 text-sm text-gray-600">La page que vous recherchez n'existe pas ou a été déplacée.</p>
            </div>
            <div class="mt-8">
                <UButton color="primary" icon="i-heroicons-arrow-left" class="mx-auto" @click="handleError"> Retour à l'accueil </UButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps({
    error: {
        type: Object,
        default: () => ({
            statusCode: 404,
            statusMessage: 'Page non trouvée'
        })
    }
})

function handleError() {
    clearError({ redirect: '/login' })
}
</script>
