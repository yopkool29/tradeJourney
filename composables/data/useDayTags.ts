import { z } from 'zod'
import { DayTagSchema } from '~/schema/dayTag'
import { formatDateToYYYYMMDD, normalizeDateToUTCString } from '~/utils/date-utils'

import type { CreateDayTagType, UpdateDayTagType, DayTagType } from '~/schema/dayTag'
export const useDayTags = () => {
    const dbStateStore = useDbStateStore()

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

        dbStateStore.dayTags = z.array(DayTagSchema).parse(result)

        return dbStateStore.dayTags
    }

    // Récupérer un DayTag par date (sans appel API, utilise le cache)
    const getDayTagByDate = async (date: Date) => {
        if (!date) return null

        // Normaliser la date d'entrée en format YYYY-MM-DD
        // On utilise l'heure locale car group.day vient du calendrier en heure locale
        const dateStr = formatDateToYYYYMMDD(date)

        // Chercher dans le cache en comparant les dates normalisées
        return dbStateStore.dayTags.find((dt: DayTagType) => {
            // Les dates du store sont en UTC, mais on les compare en tant que "jour calendaire"
            // On extrait le jour calendaire UTC qui correspond au même jour que la date locale
            const dtDateStr = normalizeDateToUTCString(new Date(dt.date))
            return dtDateStr === dateStr
        }) || null
    }

    // Créer un nouveau DayTag
    const createDayTag = async (dayTag: CreateDayTagType) => {
        const result = await $fetch('/api/day-tags', {
            method: 'POST',
            body: dayTag
        })

        const newDayTag = DayTagSchema.parse(result)

        dbStateStore.dayTags.push(newDayTag)

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
        const index = dbStateStore.dayTags.findIndex((dt: DayTagType) => dt.id === updatedDayTag.id)

        if (index !== -1) {
            dbStateStore.dayTags[index] = updatedDayTag
        }

        return updatedDayTag
    }

    // Supprimer un DayTag
    const deleteDayTag = async (id: number) => {
        await $fetch(`/api/day-tags/${id}`, {
            method: 'DELETE'
        })

        // Mettre à jour le cache
        dbStateStore.dayTags = dbStateStore.dayTags.filter((dt: DayTagType) => dt.id !== id)

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
