export default defineNuxtPlugin(() => {
    if (typeof document === 'undefined') return

    const disableSpellcheck = (el: Element) => {
        el.setAttribute('spellcheck', 'false')
        el.setAttribute('autocomplete', 'off')
    }

    // Apply to all existing inputs/textareas
    document.querySelectorAll('input, textarea').forEach(disableSpellcheck)

    // Watch for new inputs/textareas added to the DOM
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.matches('input, textarea')) {
                        disableSpellcheck(node)
                    }
                    node.querySelectorAll('input, textarea').forEach(disableSpellcheck)
                }
            }
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
})
