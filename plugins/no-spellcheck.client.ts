export default defineNuxtPlugin(() => {
    if (typeof document === 'undefined') return

    const disableSpellcheck = (el: Element) => {
        el.setAttribute('spellcheck', 'false')
        el.setAttribute('autocomplete', 'off')
    }

    const selector = 'input, textarea, [contenteditable]'

    // Apply to all existing inputs/textareas/contenteditable
    document.querySelectorAll(selector).forEach(disableSpellcheck)

    // Watch for new inputs/textareas/contenteditable added to the DOM
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.matches(selector)) {
                        disableSpellcheck(node)
                    }
                    node.querySelectorAll(selector).forEach(disableSpellcheck)
                }
            }
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
})
