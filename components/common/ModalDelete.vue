<template>
    <UModal v-model:open="open" :dismissible="true" :title="modalTitle">
        <slot name="trigger" />

        <template #body>
            <slot name="content" />
        </template>

        <template #footer>
            <div class="flex justify-end gap-2">
                <UButton
                    :color="confirmColor"
                    variant="solid"
                    @click="
                        () => {
                            open = false
                            emit('confirm')
                        }
                    "
                    >{{ modalConfirmText }}</UButton
                >
                <UButton
                    color="neutral"
                    variant="ghost"
                    @click="
                        () => {
                            open = false
                            emit('cancel')
                        }
                    "
                    >{{ modalCancelText }}</UButton
                >
            </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import type { SettingsContentType } from '~/schema/user'

const userStore = useUserStore()

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    confirmText: {
        type: String,
        default: '',
    },
    cancelText: {
        type: String,
        default: '',
    },
    confirmColor: {
        type: String as () => 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral',
        default: 'error',
    },
    from: {
        type: String,
        default: '',
    },
})

const { t } = useI18n()

const open = defineModel<boolean>('open')

const emit = defineEmits<{
    (e: 'cancel' | 'confirm' | 'opened' | 'closed'): void
}>()

// Computed properties pour les textes traduits
const modalTitle = computed(() => (props.title ? props.title : t('components.modal_delete.title')))
const modalConfirmText = computed(() => (props.confirmText ? props.confirmText : t('common.actions.confirm')))
const modalCancelText = computed(() => (props.cancelText ? props.cancelText : t('common.actions.cancel')))

// Surveiller l'ouverture de la modale
watch(open, (newValue) => {
    if (newValue) {
        // Émettre l'événement d'ouverture
        emit('opened')

        // Si la modale est ouverte et que la confirmation est désactivée
        const settings = userStore.user?.settings_object as SettingsContentType | undefined

        if (props.from === 'trade') {
            const val = settings?.deleteConfirmationTrade ?? true
            if (!val) {
                // Contourner la modale et émettre directement l'événement de confirmation
                open.value = false
                emit('confirm')
            }
        }

        if (props.from === 'note_tags') {
            const val = settings?.deleteConfirmationNoteTags ?? true
            if (!val) {
                // Contourner la modale et émettre directement l'événement de confirmation
                open.value = false
                emit('confirm')
            }
        }
    } else {
        emit('closed')
    }
})
</script>
