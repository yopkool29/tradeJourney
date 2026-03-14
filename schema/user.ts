import { z } from 'zod'

export const UserSchema = z.object({
    id: z.number(),
    email: z.string(),
    token: z.string().optional(),
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
    showCalendarCalendar: z.boolean().default(true),
    autoDataSync: z.boolean().default(true),
    showQuickNav: z.boolean().default(false),
    ninjaTraderApiPort: z.number().default(8080),
    ninjaTraderApiDays: z.number().default(1),
    timezoneDisplay: z.enum(['CURRENT', 'LOCAL', 'UTC']).default('CURRENT'),
    timezoneLocal: z.string().default('Europe/Paris'),
    timezoneUtcOffset: z.number().default(0),
    pnlThreshold: z.number().default(0),
    defaultDatabaseId: z.number().optional().nullable(),
    storageUrl: z.string().default('https://your-ngrok-url.ngrok.io'),
    storagePassword: z.string().default(''),
    converterParams: z.record(
        z.object({
            accountName: z.string(),
            accountFullname: z.string(),
            importName: z.string(),
        })
    ).optional(),
    chartColors: z.object({
        cumulatedPnlChart: z.object({
            bar: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            point: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
        apptChart: z.object({
            bar: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            movingAverage: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
        plRatioChart: z.object({
            bar: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            movingAverage: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
        winrateChart: z.object({
            bar: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            movingAverage: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
        pnlBarChart: z.object({
            profit: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            loss: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            breakeven: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
        tradeTypeBadges: z.object({
            buy: z.object({
                light: z.string(),
                dark: z.string(),
            }),
            sell: z.object({
                light: z.string(),
                dark: z.string(),
            }),
        }),
    }).default({
        cumulatedPnlChart: {
            bar: { light: '#38bdf8', dark: '#38bdf8' },
            point: { light: '#444', dark: '#e79a0b' },
        },
        apptChart: {
            bar: { light: '#4ade80', dark: '#4ade80' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)' },
        },
        plRatioChart: {
            bar: { light: '#f59e0b', dark: '#f59e0b' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)' },
        },
        winrateChart: {
            bar: { light: '#ccba18', dark: '#ccba18' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)' },
        },
        pnlBarChart: {
            profit: { light: 'rgba(34, 197, 94, 0.8)', dark: 'rgba(34, 197, 94, 0.8)' },
            loss: { light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(239, 68, 68, 0.8)' },
            breakeven: { light: 'rgba(156, 163, 175, 0.8)', dark: 'rgba(156, 163, 175, 0.8)' },
        },
        tradeTypeBadges: {
            buy: { light: '#10b981', dark: '#21c65e' },
            sell: { light: '#f97316', dark: '#e27373' },
        },
    }),
})

export type SettingsContentType = z.infer<typeof SettingsContentSchema>

// État des paramètres par défaut - généré automatiquement à partir du schéma
export const defaultSettings: SettingsContentType = SettingsContentSchema.parse({})
