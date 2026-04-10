import { Crepe } from '@milkdown/crepe'
import { commonmark } from '@milkdown/preset-commonmark'
import { gfm } from '@milkdown/preset-gfm'

export const useMilkdownEditor = (initialContent = '') => {
    const editor = ref<Crepe | null>(null)
    const loading = ref(true)
    const containerRef = ref<HTMLElement | null>(null)
    const content = ref(initialContent)

    const initEditor = async () => {
        if (!containerRef.value) return

        try {
            // Créer l'éditeur Crepe avec configuration de base fonctionnelle
            editor.value = new Crepe({
                root: containerRef.value,
                defaultValue: initialContent || '# Commencez à écrire\n\nVotre contenu Markdown ici...',
                features: {
                    [Crepe.Feature.TopBar]: true,
                },
            })

            await editor.value.create()
            
            editor.value.on((api) => {
                api.markdownUpdated((_ctx, markdown) => {
                    content.value = markdown
                })
            })

            loading.value = false
        } catch (error) {
            console.error('Failed to initialize Milkdown Crepe editor:', error)
            loading.value = false
        }
    }

    // Watcher pour le conteneur
    watch(containerRef, (newRef) => {
        if (newRef && loading.value) {
            nextTick(() => {
                initEditor()
            })
        }
    }, { immediate: true })

    const getContent = (): string => {
        return content.value
    }

    const setContent = async (newContent: string) => {
        content.value = newContent
        if (editor.value && containerRef.value) {
            // Détruire et recréer l'éditeur avec le nouveau contenu
            try {
                await editor.value.destroy()
                editor.value = new Crepe({
                    root: containerRef.value,
                    defaultValue: newContent,
                    features: {
                        [Crepe.Feature.TopBar]: true,
                    },
                })
                await editor.value.create()
                
                editor.value.on((api) => {
                    api.markdownUpdated((_ctx, markdown) => {
                        content.value = markdown
                    })
                })
            } catch (error) {
                console.error('Failed to set content:', error)
            }
        }
    }

    const destroyEditor = () => {
        if (editor.value) {
            editor.value.destroy()
            editor.value = null
        }
    }

    onMounted(() => {
        // Le composant est monté, le watcher s'occupera de l'initialisation
    })

    onBeforeUnmount(() => {
        destroyEditor()
    })

    return {
        editor,
        loading,
        containerRef,
        getContent,
        setContent,
        destroyEditor
    }
}
