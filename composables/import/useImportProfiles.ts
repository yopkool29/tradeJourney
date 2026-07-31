import { z } from 'zod'
import type { ImportProfileType, CreateImportProfileType, UpdateImportProfileType } from '~/schema/importProfile'
import { ImportProfileSchema } from '~/schema/importProfile'

export const useImportProfiles = () => {
    const profiles = ref<ImportProfileType[]>([])

    const fetchProfiles = async (): Promise<ImportProfileType[]> => {
        const result = await $fetch('/api/import-profiles')
        profiles.value = z.array(ImportProfileSchema).parse(result)
        return profiles.value
    }

    const createProfile = async (profile: CreateImportProfileType) => {
        const result = await $fetch('/api/import-profiles', { method: 'POST', body: profile })
        return ImportProfileSchema.parse(result)
    }

    const updateProfile = async (profile: UpdateImportProfileType) => {
        const result = await $fetch('/api/import-profiles', { method: 'PATCH', body: profile })
        return ImportProfileSchema.parse(result)
    }

    const deleteProfile = async (id: number) => {
        return await $fetch(`/api/import-profiles/${id}`, { method: 'DELETE' })
    }

    return {
        profiles,
        fetchProfiles,
        createProfile,
        updateProfile,
        deleteProfile,
    }
}
