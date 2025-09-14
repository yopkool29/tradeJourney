import { z } from 'zod'
import { DayTagSchema } from '~/schema/dayTag'

import type { CreateDayTagType, UpdateDayTagType, DayTagType } from '~/schema/dayTag'
import { useUserStore } from '~/stores/user'

export function useDayTags() {
    // Utiliser le store utilisateur pour accéder à dayTags
    const userStore = useUserStore()

    // Charger les DayTags depuis l'API, avec option pour filtrer par mois
    const fetchDayTags = async (month?: string) => {
        // Préparer les paramètres de requête
        const query: Record<string, string> = {}

        // Si un mois est spécifié (format 'YYYY-MM'), ajouter le filtre
        if (month) {
            query.month = month
        }

        // Utiliser $fetch avec les paramètres dans query (pour GET)
        const result = await $fetch('/api/day-tags', { query })

        userStore.dayTags = z.array(DayTagSchema).parse(result)

        return userStore.dayTags
    }

    // Récupérer un DayTag par date (sans appel API, utilise le cache)
    const getDayTagByDate = async (date: Date) => {
        if (!date) return null

        // Format de date ISO sans l'heure pour la comparaison
        const dateStr = date.toISOString().split('T')[0]

        // Chercher dans le cache
        return userStore.dayTags.find((dt: DayTagType) =>
            new Date(dt.date).toISOString().split('T')[0] === dateStr
        ) || null
    }

    // Créer un nouveau DayTag
    const createDayTag = async (dayTag: CreateDayTagType) => {
        const result = await $fetch('/api/day-tags', {
            method: 'POST',
            body: dayTag
        })

        const newDayTag = DayTagSchema.parse(result)

        userStore.dayTags.push(newDayTag)

        return newDayTag
    }

    // Mettre à jour un DayTag existant
    const updateDayTag = async (dayTag: UpdateDayTagType) => {
        const result = await $fetch(`/api/day-tags/${dayTag.id}`, {
            method: 'PATCH',
            body: dayTag
        })

        const updatedDayTag = DayTagSchema.parse(result)

        // Mettre à jour le cache
        const index = userStore.dayTags.findIndex((dt: DayTagType) => dt.id === updatedDayTag.id)

        if (index !== -1) {
            userStore.dayTags[index] = updatedDayTag
        }

        return updatedDayTag
    }

    // Supprimer un DayTag
    const deleteDayTag = async (id: number) => {
        await $fetch(`/api/day-tags/${id}`, {
            method: 'DELETE'
        })

        // Mettre à jour le cache
        userStore.dayTags = userStore.dayTags.filter((dt: DayTagType) => dt.id !== id)

        return { success: true }
    }

    return {
        fetchDayTags,
        getDayTagByDate,
        createDayTag,
        updateDayTag,
        deleteDayTag
    }
}
