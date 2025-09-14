<template>
    <div v-if="userStore.isLoading" class="fixed inset-0 w-full h-[100vh] z-40 flex items-center justify-center overflow-hidden">
        <!-- Overlay noir semi-transparent -->
        <div class="absolute inset-0 bg-black opacity-40"></div>
        <!-- Contenu loading au-dessus, sans opacité -->
        <div class="relative z-10 flex flex-col items-center">
            <Icon name="eos-icons:bubble-loading" size="100" class="text-gray-100" />
            <div class="text-center pt-5 text-xl font-bold text-gray-100">Loading</div>
        </div>
    </div>
</template>

<script setup>
const userStore = useUserStore()
</script>
