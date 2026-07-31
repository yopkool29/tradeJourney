export const useAlert = () => {
    const errorStr = ref<string | null>(null)
    const successStr = ref<string | null>(null)
    const { success: toastSuccess, error: toastError } = useAppToast()
    const { log_error } = useLogView()

    const displayMessage = (success: string | null, error: string | null) => {
        successStr.value = success || null
        errorStr.value = error || null
        if (success) {
            toastSuccess('', success)
        }
        if (error) {
            toastError('', error)
            log_error(error)
        }
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
