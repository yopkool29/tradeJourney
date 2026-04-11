import { customRef } from 'vue'

const focusableSelector = 'button, [href], input, select, textarea, .ProseMirror, [tabindex]:not([tabindex="-1"])'

export const useFocusTrap = () => {
    let focusableElements: HTMLElement[] = []
    let firstFocusable: HTMLElement | null = null
    let lastFocusable: HTMLElement | null = null

    const trapRef = customRef<HTMLElement | null>((track, trigger) => {
        let el: HTMLElement | null = null
        return {
            get() {
                track()
                return el
            },
            set(value) {
                el = value
                value ? initFocusTrap() : clearFocusTrap()
                trigger()
            },
        }
    })

    const keyHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        if (!firstFocusable || !lastFocusable) return

        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                lastFocusable.focus()
                e.preventDefault()
            }
        } else {
            if (document.activeElement === lastFocusable) {
                firstFocusable.focus()
                e.preventDefault()
            }
        }
    }

    const initFocusTrap = () => {
        if (!trapRef.value) return
        focusableElements = Array.from(trapRef.value.querySelectorAll<HTMLElement>(focusableSelector))
        firstFocusable = focusableElements[0] ?? null
        lastFocusable = focusableElements[focusableElements.length - 1] ?? null
        document.addEventListener('keydown', keyHandler)
        firstFocusable?.focus()
    }

    const clearFocusTrap = () => {
        document.removeEventListener('keydown', keyHandler)
    }

    return { trapRef, initFocusTrap, clearFocusTrap }
}
