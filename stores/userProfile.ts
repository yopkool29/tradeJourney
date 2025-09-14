
export const useUserProfileStore = defineStore(
    'userProfile',
    () => {
        const userProfile = ref({
        })

        return {
            userProfile,
        }
    }
)
