import { getDetailedError } from '~/utils';
import type { ErrorMessage } from '~/type'
import { type UserType, defaultSettings } from '~/schema/user'

interface LoginCredentialsType {
    email: string;
    password: string;
}

export const useAuth = () => {
    const userStore = useUserStore()
    const { log_error } = useLogView()

    const login = async (credentials: LoginCredentialsType): Promise<UserType> => {
        const res = await $fetch('/api/auth/login', {
            method: 'POST',
            body: credentials
        })
        const userSettings = JSON.parse(res.settings || '{}')
        userStore.setUser({ ...res, settings_object: { ...defaultSettings, ...userSettings } })
        return res
    }

    const logout = async () => {
        try {
            await $fetch('/api/auth/logout', {
                method: 'POST'
            })
        }
        catch (err) {
            const message = getDetailedError(err as ErrorMessage)
            log_error(message)
        }
        finally {
            userStore.clearUser()
        }
    }

    const fetchUser = async (headers?: {
        cookie?: string | undefined;
    }): Promise<UserType> => {
        const res = await $fetch('/api/auth', { headers })
        const userSettings = JSON.parse(res.settings || '{}')
        return { ...res, settings_object: { ...defaultSettings, ...userSettings } }
    }

    const updateSettings = async (settings: string) => {
        await $fetch('/api/auth/settings', {
            method: 'PATCH',
            body: { settings }
        })
    }

    const updateUserSettings = async (updates: Partial<typeof defaultSettings>) => {
        if (!userStore.user?.settings_object) return

        const updatedSettings = {
            ...userStore.user.settings_object,
            ...updates
        }
        const json = JSON.stringify(updatedSettings)
        
        // Mettre à jour localement
        userStore.user.settings = json
        userStore.user.settings_object = updatedSettings
        
        // Mettre à jour sur le serveur
        await updateSettings(json)
    }

    const getUserSetting = <K extends keyof typeof defaultSettings>(key: K): typeof defaultSettings[K] | undefined => {
        return userStore.user?.settings_object?.[key]
    }

    return {
        login,
        logout,
        fetchUser,
        updateSettings,
        updateUserSettings,
        getUserSetting
    }
}
