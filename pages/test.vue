<template>
    <div class="flex flex-col items-center p-4">
        <UButton color="primary" :loading="isLoading" @click="fetchData">
            {{ buttonText }}
        </UButton>
        {{ errorStr }}
        <div v-if="responseData" class="mt-4 p-4 bg-gray-100 rounded w-full max-w-md">
            <pre>{{ JSON.stringify(responseData, null, 2) }}</pre>
        </div>
    </div>
</template>

<script setup lang="ts">
// import type { ErrorMessage } from '~/type'


// const { t } = useI18n()

// // Types simples
// type ApiResponse = {
//     success: boolean
//     content: string
// }

// // State
// const isLoading = ref(false)
// const errorStr = ref<string | null>(null)
// const responseData = ref<ApiResponse | null>(null)

// // Récupération des données
// async function fetchData() {
//     isLoading.value = true
//     errorStr.value = null

//     try {
//         responseData.value = await $fetch<ApiResponse>('/api/test', {
//             method: 'POST',
//             body: { param: 'test2' },
//         })

//         // En cas de succès
//         errorStr.value = 'Requête réussie !'
//     } catch (err) {
//         const { message } = catchTagMessage(err as ErrorMessage, t)
//         errorStr.value = message
//     } finally {
//         isLoading.value = false
//     }
// }

// // Texte du bouton
// const buttonText = computed(() => (isLoading.value ? 'Chargement...' : 'Tester'))
</script>
