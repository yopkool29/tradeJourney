import { z } from 'zod'

export const UserSchema = z.object({
    id: z.number(),
    email: z.string(),
    settings: z.string(),
    settings_object: z.record(z.any()).optional().nullable(),
})

export type UserType = z.infer<typeof UserSchema>

export const SettingsSchema = z.object({
    settings: z.string(),
})

// Schéma de validation pour les paramètres
export const SettingsContentSchema = z.object({
    deleteConfirmationTrade: z.boolean().default(true),
    deleteConfirmationNoteTags: z.boolean().default(true),
    showCalendarDaily: z.boolean().default(true),
})

export type SettingsContentType = z.infer<typeof SettingsContentSchema>

// État des paramètres par défaut
export const defaultSettings: SettingsContentType = {
    deleteConfirmationTrade: true,
    deleteConfirmationNoteTags: true,
    showCalendarDaily: true,
}
