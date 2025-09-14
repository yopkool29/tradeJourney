<template>
    <div class="flex flex-col gap-y-2">
        <!-- Instructions -->
        <div class="text-sm text-gray-600 font-semibold">
            <p>{{ $t('components.screenshot.manager.instructions') }}</p>
            <p class="mt-1">{{ $t('components.screenshot.manager.formats', { max: maxScreenshots }) }}</p>
        </div>

        <div class="flex gap-2">
            <!-- Bouton pour coller depuis le presse-papiers -->
            <UButton
                type="button"
                color="primary"
                variant="outline"
                icon="i-heroicons-clipboard"
                :disabled="screenshots.length >= maxScreenshots"
                :title="
                    screenshots.length >= maxScreenshots ? $t('components.screenshot.manager.max_reached', { max: maxScreenshots }) : $t('components.screenshot.manager.paste_title')
                "
                class="flex-1 sm:flex-none"
                @click="pasteFromClipboard"
            >
                <span class="hidden sm:inline">{{ $t('components.screenshot.manager.paste_button') }}</span>
            </UButton>

            <!-- Input pour sélectionner les fichiers -->
            <UInput
                id="media"
                type="file"
                accept="image/*"
                multiple
                :disabled="screenshots.length >= maxScreenshots"
                class="flex-1"
                @change="handleFileUpload"
            >
                <template #leading>
                    <UIcon name="i-heroicons-photo" class="text-gray-500" />
                </template>
            </UInput>
        </div>

        <!-- Info sur le nombre d'images -->
        <div class="text-xs text-gray-500 mt-1">
            {{ $t('components.screenshot.manager.image_count', { current: screenshots.length, max: maxScreenshots }) }}
            <span v-if="screenshots.length >= maxScreenshots" class="text-amber-600 font-medium">{{ $t('components.screenshot.manager.max_reached_alert') }}</span>
        </div>

        <div class="flex flex-col gap-y-4">
            <!-- Affichage des fichiers sélectionnés (nouveaux et existants) -->
            <div v-if="screenshots.length > 0" class="mt-4">
                <p class="text-sm font-medium mb-2">{{ $t('components.screenshot.manager.images_label', { current: screenshots.length, max: maxScreenshots }) }}</p>
                <div class="flex flex-wrap gap-3">
                    <div v-for="(screenshot, index) in screenshots" :key="index" class="relative">
                        <template v-if="screenshot.isNew">
                            <img
                                :src="screenshot.url"
                                :alt="$t('components.screenshot.manager.image_preview')"
                                :style="`width: ${maxImageWidth}px;height: ${maxImageHeight}px`"
                                class="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                @click="openPreview(screenshot)"
                            />
                        </template>
                        <template v-else>
                            <img
                                :alt="$t('components.screenshot.manager.image_preview')"
                                :style="`width: ${maxImageWidth}px;height: ${maxImageHeight}px`"
                                class="object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                :src="getImagePath(screenshot.url)"
                                @click="openPreview(screenshot)"
                            />
                        </template>
                        <UButton
                            class="absolute -top-2 -right-2 bg-orange-500 rounded-full w-6 h-6"
                            type="button"
                            icon="i-heroicons-trash"
                            size="xs"
                            @click="removeScreenshot(index)"
                        />
                    </div>
                </div>
            </div>
            <!-- Modal pour afficher l'image en grand -->
            <UCard v-if="screenshots.length > 0 && previewImageUrl" v-model="isPreviewOpen" :ui="{ header: 'p-0', body: 'sm:p-0 p-0' }">
                <div class="flex justify-center">
                    <img
                        v-if="previewImageUrl?.isNew"
                        :src="previewImageUrl?.url"
                        :alt="$t('components.screenshot.manager.image_preview')"
                        class="max-h-[80vh] max-w-full object-contain hover:opacity-80 transition-opacity"
                    />
                    <img
                        v-else
                        :alt="$t('components.screenshot.manager.image_preview')"
                        class="object-cover rounded border hover:opacity-80 transition-opacity"
                        :src="getImagePath(previewImageUrl?.url)"
                    />
                </div>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSharedScreenshots, type ScreenshotItem } from '~/composables/useSharedScreenshots'
import { getImagePath } from '~/utils'
import { useToast, useI18n } from '#imports'

const { t } = useI18n()

const props = withDefaults(
    defineProps<{
        modelValue?: ScreenshotItem[]
        maxScreenshots?: number
        maxImageWidth?: number
        maxImageHeight?: number
    }>(),
    {
        modelValue: () => [],
        maxScreenshots: 3,
        maxImageWidth: 96,
        maxImageHeight: 96,
    }
)

const emit = defineEmits<{
    'update:modelValue': [value: string | number | unknown[]]
}>()

const toast = useToast()

// Gestion de l'aperçu de l'image
const isPreviewOpen = ref(false)
const previewImageUrl = ref<ScreenshotItem | null>(null)

// Gestion du collage depuis le presse-papiers
const pasteFromClipboard = async () => {
    try {
        // Vérifier si on peut ajouter plus d'images
        if (screenshots.value.length >= props.maxScreenshots) {
            toast.add({
                title: 'Limite atteinte',
                description: `Vous ne pouvez pas ajouter plus de ${props.maxScreenshots} images`,
                color: 'primary',
                icon: 'i-heroicons-exclamation-triangle',
            })
            return
        }

        // Essayer de lire le presse-papiers
        const clipboardItems = await navigator.clipboard.read()

        for (const clipboardItem of clipboardItems) {
            // Vérifier s'il y a une image dans le presse-papiers
            if (clipboardItem.types.includes('image/png')) {
                const blob = await clipboardItem.getType('image/png')

                // Créer un fichier à partir du blob
                const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })

                // Ajouter le fichier à la liste des screenshots
                const url = URL.createObjectURL(file)
                screenshots.value.push({
                    url,
                    file,
                    isNew: true,
                })

                // Émettre la mise à jour
                emit('update:modelValue', [...screenshots.value])

                toast.add({
                    title: t('components.screenshot.manager.toast_success_title'),
                    description: t('components.screenshot.manager.toast_success_desc'),
                    color: 'primary',
                    icon: 'i-heroicons-check-circle',
                })

                break // On ne prend que la première image pour l'instant
            }
        }
    } catch (error) {
        console.error('Erreur lors du collage depuis le presse-papiers:', error)
        toast.add({
            title: t('components.screenshot.manager.toast_error_title'),
            description: t('components.screenshot.manager.toast_error_desc'),
            color: 'error',
            icon: 'i-heroicons-exclamation-circle',
        })
    }
}

// Gestion du raccourci clavier Ctrl+V
const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteFromClipboard()
    }
}

// Ajouter/retirer l'écouteur d'événements
onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeyDown)
})

const openPreview = (screenshot: ScreenshotItem) => {
    previewImageUrl.value = screenshot
    isPreviewOpen.value = true
}

// Vérifier si l'API Clipboard est disponible
const isClipboardApiAvailable = ref(false)
onMounted(() => {
    isClipboardApiAvailable.value = 'clipboard' in navigator && 'read' in navigator.clipboard && 'write' in navigator.clipboard
})

// Initialiser le composable avec état partagé
const { screenshots, handleFileUpload, removeScreenshot, cleanup, maxScreenshots } = useSharedScreenshots(props.maxScreenshots)

// Synchroniser les changements avec le v-model
watch(
    screenshots,
    (newVal) => {
        emit('update:modelValue', newVal)
    },
    { deep: true }
)

// Nettoyer les ressources lors de la destruction du composant
// onBeforeUnmount(() => {
//     cleanup()
// })
</script>
