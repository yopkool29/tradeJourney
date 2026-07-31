const useFormCtrlS = (formId: string, isActive: () => boolean) => {
    const isTopModal = () => {
        const form = document.getElementById(formId)
        if (!form) return false
        const formZ = parseInt(getComputedStyle(form.closest('[role="dialog"]') ?? form).zIndex || '0')
        const allDialogs = Array.from(document.querySelectorAll('[role="dialog"]'))
        return allDialogs.every((dialog) => {
            const z = parseInt(getComputedStyle(dialog).zIndex || '0')
            return z <= formZ
        })
    }

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 's' && (e.ctrlKey || e.metaKey) && isActive() && isTopModal()) {
            e.preventDefault()
            e.stopPropagation()
            document.getElementById(formId)?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        }
    }

    onMounted(() => { document.addEventListener('keydown', onKeyDown, true) })
    onUnmounted(() => { document.removeEventListener('keydown', onKeyDown, true) })
}

export default useFormCtrlS
