const modalStack = useState<string[]>('modalStack', () => [])

const useModalStack = (id: string) => {
    const isTop = computed(() => modalStack.value[modalStack.value.length - 1] === id)

    const push = () => {
        if (!modalStack.value.includes(id)) {
            modalStack.value = [...modalStack.value, id]
        }
    }

    const pop = () => {
        modalStack.value = modalStack.value.filter(i => i !== id)
    }

    return { isTop, push, pop }
}

export default useModalStack
