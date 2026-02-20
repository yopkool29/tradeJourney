export const useAlert = () => {
    const errorStr = ref<string | null>(null)
    const successStr = ref<string | null>(null)

    const displayMessage = (success: string | null, error: string | null) => {
        successStr.value = success || null
        errorStr.value = error || null
    }

    const clearMessages = () => {
        successStr.value = null
        errorStr.value = null
    }

    return {
        errorStr,
        successStr,
        displayMessage,
        clearMessages
    }
}
