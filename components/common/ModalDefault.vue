<template>
    <UModal v-model:open="open" :dismissible="dismissible" :description="modalDescription" :class="customClass" :ui="{ ...ui, description: hideDescription ? 'sr-only' : undefined }" @after:enter="onAfterEnter">
        <template #title>
            <span v-if="!title" class="sr-only">{{ $t('common.modal.default_title', 'Dialog') }}</span>
            <template v-else>{{ title }}</template>
        </template>

        <slot name="trigger" />

        <template #body>
            <slot name="content" />
        </template>

        <template v-if="$slots.footer" #footer>
            <slot name="footer" />
        </template>
    </UModal>
</template>

<script setup lang="ts">
const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    description: {
        type: String,
        default: '',
    },
    hideDescription: {
        type: Boolean,
        default: true,
    },
    customClass: {
        type: String,
        default: '',
    },
    ui: {
        type: Object,
        default: () => ({})
    },
    dismissible: {
        type: Boolean,
        default: true,
    }
})

const modalDescription = computed(() => (props.description ? props.description : props.title))

const open = defineModel<boolean>('open')

const emit = defineEmits<{
    (e: 'opened' | 'closed'): void
}>()

// Make the modal body (overflow-y-auto) focusable so keyboard scrolling
// (arrows, PageUp/Down, Home/End) works. Reka UI's Dialog traps focus on
// focusable elements like buttons, which intercepts arrow keys for focus
// navigation instead of scrolling.
// We install a keydown listener on the dialog content so scrolling works
// regardless of which inner element currently holds focus.
// Each modal instance captures its own dialog element reference so nested
// modals don't clobber each other's handlers.
let scrollEl: HTMLElement | null = null
let dialogEl: HTMLElement | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
const onAfterEnter = () => {
    nextTick(() => {
        // Pick the last [role="dialog"] in DOM order — the most recently opened.
        const dialogs = document.querySelectorAll('[role="dialog"]')
        const content = dialogs[dialogs.length - 1]
        if (!(content instanceof HTMLElement)) return
        dialogEl = content
        const body = content.querySelector('.overflow-y-auto')
        if (body instanceof HTMLElement) {
            scrollEl = body
            body.setAttribute('tabindex', '0')
            body.focus({ preventScroll: true })

            keydownHandler = (e: KeyboardEvent) => {
                if (!scrollEl) return
                // Don't interfere with inputs/contenteditable.
                const target = e.target as HTMLElement
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
                const step = scrollEl.clientHeight * 0.8
                switch (e.key) {
                    case 'ArrowDown':
                        scrollEl.scrollBy({ top: step * 0.1, behavior: 'auto' })
                        e.preventDefault()
                        break
                    case 'ArrowUp':
                        scrollEl.scrollBy({ top: -step * 0.1, behavior: 'auto' })
                        e.preventDefault()
                        break
                    case 'PageDown':
                        scrollEl.scrollBy({ top: step, behavior: 'auto' })
                        e.preventDefault()
                        break
                    case 'PageUp':
                        scrollEl.scrollBy({ top: -step, behavior: 'auto' })
                        e.preventDefault()
                        break
                    case 'Home':
                        scrollEl.scrollTop = 0
                        e.preventDefault()
                        break
                    case 'End':
                        scrollEl.scrollTop = scrollEl.scrollHeight
                        e.preventDefault()
                        break
                    case ' ':
                        scrollEl.scrollBy({ top: e.shiftKey ? -step : step, behavior: 'auto' })
                        e.preventDefault()
                        break
                }
            }
            content.addEventListener('keydown', keydownHandler)
        }
    })
    emit('opened')
}

const onAfterLeave = () => {
    if (keydownHandler && dialogEl) {
        dialogEl.removeEventListener('keydown', keydownHandler)
    }
    keydownHandler = null
    dialogEl = null
    scrollEl = null
    emit('closed')
}

watch(open, (newValue: boolean) => {
    if (!newValue) {
        onAfterLeave()
    }
})
</script>
