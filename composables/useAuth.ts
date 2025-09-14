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
        userStore.setUser({ ...res, settings_object: res.settings ? JSON.parse(res.settings) : defaultSettings })
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
        return { ...res, settings_object: JSON.parse(res.settings) }
    }

    const updateSettings = async (settings: string) => {
        await $fetch('/api/auth/settings', {
            method: 'PATCH',
            body: { settings }
        })
    }

    return {
        login,
        logout,
        fetchUser,
        updateSettings
    }
}
