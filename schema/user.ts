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
    chartColors: z.object({
        cumulatedPnlChart: z.object({
            bar: z.object({
                light: z.string().default('#38bdf8'),
                dark: z.string().default('#38bdf8'),
            }),
            point: z.object({
                light: z.string().default('#444'),
                dark: z.string().default('#e79a0b'),
            }),
        }),
        apptChart: z.object({
            bar: z.object({
                light: z.string().default('#4ade80'),
                dark: z.string().default('#4ade80'),
            }),
            movingAverage: z.object({
                light: z.string().default('#444'),
                dark: z.string().default('rgb(52, 128, 204)'),
            }),
        }),
        plRatioChart: z.object({
            bar: z.object({
                light: z.string().default('#f59e0b'),
                dark: z.string().default('#f59e0b'),
            }),
            movingAverage: z.object({
                light: z.string().default('#444'),
                dark: z.string().default('rgb(52, 128, 204)'),
            }),
        }),
        winrateChart: z.object({
            bar: z.object({
                light: z.string().default('#ccba18'),
                dark: z.string().default('#ccba18'),
            }),
            movingAverage: z.object({
                light: z.string().default('#444'),
                dark: z.string().default('rgb(52, 128, 204)'),
            }),
        }),
        pnlBarChart: z.object({
            profit: z.object({
                light: z.string().default('#60E490'),
                dark: z.string().default('#60E490'),
            }),
            loss: z.object({
                light: z.string().default('rgba(239, 68, 68, 0.8)'),
                dark: z.string().default('rgba(239, 68, 68, 0.8)'),
            }),
            breakeven: z.object({
                light: z.string().default('rgba(156, 163, 175, 0.8)'),
                dark: z.string().default('rgba(156, 163, 175, 0.8)'),
            }),
        }),
        tradeTypeBadges: z.object({
            buy: z.object({
                light: z.string().default('#10b981'),
                dark: z.string().default('#86efac'),
            }),
            sell: z.object({
                light: z.string().default('#f97316'),
                dark: z.string().default('#fca5a5'),
            }),
        }).optional(),
    }).optional(),
})

export type SettingsContentType = z.infer<typeof SettingsContentSchema>

// État des paramètres par défaut
export const defaultSettings: SettingsContentType = {
    deleteConfirmationTrade: true,
    deleteConfirmationNoteTags: true,
    showCalendarDaily: true,
    showCalendarCalendar: true,
    autoDataSync: true,
    showQuickNav: false,
    ninjaTraderApiPort: 8080,
    ninjaTraderApiDays: 1,
    timezoneDisplay: 'CURRENT',
    timezoneLocal: 'Europe/Paris',
    timezoneUtcOffset: 0,
    pnlThreshold: 0,
    defaultDatabaseId: null,
    chartColors: {
        cumulatedPnlChart: {
            bar: {
                light: '#38bdf8',
                dark: '#38bdf8',
            },
            point: {
                light: '#444',
                dark: '#e79a0b',
            },
        },
        apptChart: {
            bar: {
                light: '#4ade80',
                dark: '#4ade80',
            },
            movingAverage: {
                light: '#444',
                dark: 'rgb(52, 128, 204)',
            },
        },
        plRatioChart: {
            bar: {
                light: '#f59e0b',
                dark: '#f59e0b',
            },
            movingAverage: {
                light: '#444',
                dark: 'rgb(52, 128, 204)',
            },
        },
        winrateChart: {
            bar: {
                light: '#ccba18',
                dark: '#ccba18',
            },
            movingAverage: {
                light: '#444',
                dark: 'rgb(52, 128, 204)',
            },
        },
        pnlBarChart: {
            profit: {
                light: 'rgba(34, 197, 94, 0.8)',
                dark: 'rgba(34, 197, 94, 0.8)',
            },
            loss: {
                light: 'rgba(239, 68, 68, 0.8)',
                dark: 'rgba(239, 68, 68, 0.8)',
            },
            breakeven: {
                light: 'rgba(156, 163, 175, 0.8)',
                dark: 'rgba(156, 163, 175, 0.8)',
            },
        },
        tradeTypeBadges: {
            buy: {
                light: '#10b981',
                dark: '#86efac',
            },
            sell: {
                light: '#f97316',
                dark: '#fca5a5',
            },
        },
    },
}
