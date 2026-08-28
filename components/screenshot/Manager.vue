<template>
    <div class="flex flex-col gap-y-2">
        <!-- Instructions -->
        <div v-if="!readonly" class="text-sm text-default font-semibold">
            <p>{{ $t('components.screenshot.manager.instructions') }}</p>
            <p class="mt-1">{{ $t('components.screenshot.manager.formats', { max: effectiveMaxScreenshots }) }}</p>
        </div>

        <div v-if="!readonly" class="flex gap-2">
            <!-- Bouton pour coller depuis le presse-papiers -->
            <UButton
                type="button"
                color="primary"
                variant="outline"
                icon="i-heroicons-clipboard"
                :disabled="screenshots.length >= effectiveMaxScreenshots"
                :title="
                    screenshots.length >= effectiveMaxScreenshots ? $t('components.screenshot.manager.max_reached', { max: effectiveMaxScreenshots }) : $t('components.screenshot.manager.paste_title')
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
                :disabled="screenshots.length >= effectiveMaxScreenshots"
                class="flex-1"
                @change="handleFileUpload"
            >
                <template #leading>
                    <UIcon name="i-heroicons-photo" class="text-muted" />
                </template>
            </UInput>
        </div>

        <!-- Info sur le nombre d'images -->
        <div v-if="!readonly" class="text-xs text-muted mt-1">
            {{ $t('components.screenshot.manager.image_count', { current: screenshots.length, max: effectiveMaxScreenshots }) }}
            <span v-if="screenshots.length >= effectiveMaxScreenshots" class="text-amber-600 font-medium">{{ $t('components.screenshot.manager.max_reached_alert') }}</span>
        </div>

        <div class="flex flex-col gap-y-4">
            <!-- Affichage des fichiers sélectionnés (nouveaux et existants) -->
            <div v-if="screenshots.length > 0" class="mt-4">
                <p class="text-sm font-medium mb-2">{{ $t('components.screenshot.manager.images_label', { current: screenshots.length, max: effectiveMaxScreenshots }) }}</p>
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
                                :src="getImagePath(screenshot.url, userStore.user?.id, currentDatabase?.name)"
                                @click="openPreview(screenshot)"
                            />
                        </template>
                        <UButton
                            v-if="!readonly"
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
                <div class="flex-center">
                    <img
                        v-if="previewImageUrl?.isNew"
                        :src="previewImageUrl?.url"
                        :alt="$t('components.screenshot.manager.image_preview')"
                        class="object-contain hover:opacity-80 transition-opacity"
                    />
                    <img
                        v-else
                        :alt="$t('components.screenshot.manager.image_preview')"
                        class="object-cover rounded border hover:opacity-80 transition-opacity"
                        :src="getImagePath(previewImageUrl?.url, userStore.user?.id, currentDatabase?.name)"
                    />
                </div>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useSharedScreenshots, type ScreenshotItem } from '~/composables/notes/useSharedScreenshots'
import { getImagePath } from '~/utils'
import { useI18n } from '#imports'

const { t } = useI18n()
const userStore = useUserStore()
const { currentDatabase } = useDatabase()

const props = withDefaults(
    defineProps<{
        modelValue?: ScreenshotItem[]
        maxScreenshots?: number
        maxImageWidth?: number
        maxImageHeight?: number
        readonly?: boolean
    }>(),
    {
        modelValue: () => [],
        maxScreenshots: 9,
        maxImageWidth: 96,
        maxImageHeight: 96,
        readonly: false,
    }
)

const emit = defineEmits<{
    'update:modelValue': [value: string | number | unknown[]]
}>()

const { success: toastSuccess, error: toastError, warning: toastWarning } = useAppToast()

const config = useRuntimeConfig()
const effectiveMaxScreenshots = computed(() => props.maxScreenshots ?? config.public.maxScreenshots ?? 3)

// Gestion de l'aperçu de l'image
const isPreviewOpen = ref(false)
const previewImageUrl = ref<ScreenshotItem | null>(null)

// Gestion du collage depuis le presse-papiers
const pasteFromClipboard = async () => {
    try {
        // Vérifier si on peut ajouter plus d'images
        if (sharedScreenshots.value.length >= effectiveMaxScreenshots.value) {
            toastWarning(t('components.screenshot.manager.toast_warning_title'), t('components.screenshot.manager.toast_warning_desc', { max: effectiveMaxScreenshots.value }))
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
                sharedScreenshots.value.push({
                    url,
                    file,
                    isNew: true,
                })

                toastSuccess(t('components.screenshot.manager.toast_success_title'), t('components.screenshot.manager.toast_success_desc'))

                break // On ne prend que la première image pour l'instant
            }
        }
    } catch (error) {
        console.error('Erreur lors du collage depuis le presse-papiers:', error)
        toastError(t('components.screenshot.manager.toast_error_title'), t('components.screenshot.manager.toast_error_desc'))
    }
}

// Événement paste natif — fonctionne sur tous les navigateurs (Firefox, Chrome, etc.)
// navigator.clipboard.read() nécessite HTTPS + permissions explicites, l'événement paste non
const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile()
            if (!blob) continue

            if (sharedScreenshots.value.length >= effectiveMaxScreenshots.value) {
                toastWarning(t('components.screenshot.manager.toast_warning_title'), t('components.screenshot.manager.toast_warning_desc', { max: effectiveMaxScreenshots.value }))
                e.preventDefault()
                return
            }

            const file = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type })
            const url = URL.createObjectURL(file)
            sharedScreenshots.value.push({ url, file, isNew: true })
            toastSuccess(t('components.screenshot.manager.toast_success_title'), t('components.screenshot.manager.toast_success_desc'))
            e.preventDefault()
            break
        }
    }
}

// Ajouter/retirer l'écouteur d'événements
onMounted(() => {
    document.addEventListener('paste', handlePaste)
})

onBeforeUnmount(() => {
    document.removeEventListener('paste', handlePaste)
})

const openPreview = (screenshot: ScreenshotItem) => {
    if (previewImageUrl.value?.url === screenshot.url && isPreviewOpen.value) {
        previewImageUrl.value = null
        isPreviewOpen.value = false
    } else {
        previewImageUrl.value = screenshot
        isPreviewOpen.value = true
    }
}

// Vérifier si l'API Clipboard est disponible
const isClipboardApiAvailable = ref(false)
onMounted(() => {
    isClipboardApiAvailable.value = 'clipboard' in navigator && 'read' in navigator.clipboard && 'write' in navigator.clipboard
})

// Initialiser le composable avec état partagé
const { screenshots: sharedScreenshots, handleFileUpload, removeScreenshot } = useSharedScreenshots(effectiveMaxScreenshots.value)

// In readonly mode, display screenshots from modelValue; otherwise use shared state
const screenshots = computed((): ScreenshotItem[] => {
    if (props.readonly) {
        return (props.modelValue || []).map(s => ({
            ...s,
            isNew: s.isNew ?? false,
        }))
    }
    return sharedScreenshots.value
})

// Synchroniser les changements avec le v-model
watch(
    sharedScreenshots,
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
