export const useNetGrossDisplay = () => {
    const userStore = useUserStore()
    
    return {
        displayModeNet: computed({
            get: () => userStore.displayModeNet,
            set: (value: boolean) => {
                userStore.displayModeNet = value
            }
        })
    }
}
