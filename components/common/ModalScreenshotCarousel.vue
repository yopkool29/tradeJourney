<template>
    <UModal v-model:open="open" :ui="{ content: 'md:max-w-full' }">
        <template #body>
            <div class="mb-4 text-left ml-10 text-sm text-gray-600 dark:text-gray-400">
                {{ screenshots.length }} {{ screenshots.length > 1 ? 'images' : 'image' }}
            </div>
            <UCarousel
                ref="carouselRef"
                v-slot="{ item, index }"
                arrows
                :items="screenshots"
                :ui="{ item: 'flex items-center justify-center' }"
                class="rounded-lg"
            >
                <img 
                    :src="getImagePath(item.url, userStore.user?.id, currentDatabase?.name)" 
                    :alt="`Capture d'écran ${index + 1}`" 
                    class="rounded-lg"
                    @load="onImageLoad"
                />
            </UCarousel>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { getImagePath } from '~/utils'

const userStore = useUserStore()
const { currentDatabase } = useDatabase()
const carouselRef = ref()

defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    screenshots: {
        type: Array as PropType<Array<{ id?: number; url: string }>>,
        default: () => [],
    },
})

const open = defineModel<boolean>('open')

const emit = defineEmits<{
    (e: 'opened' | 'closed'): void
}>()

const onImageLoad = () => {
    if (carouselRef.value?.emblaApi) {
        carouselRef.value.emblaApi.reInit()
    }
}

watch(open, async (newValue) => {
    if (newValue) {
        emit('opened')
        await nextTick()
        if (carouselRef.value?.emblaApi) {
            carouselRef.value.emblaApi.reInit()
        }
    } else {
        emit('closed')
    }
})
</script>
