import { z } from 'zod'

// Reusable theme color type for 4 themes
const ThemeColor = z.object({
    light: z.string(),
    dark: z.string(),
    'light-blue': z.string(),
    'dark-gold': z.string(),
})

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
    reverseDaysOrder: z.boolean().default(false),
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
        tableRowHover: ThemeColor,
        pnlchart: z.object({
            line: ThemeColor,
            point: ThemeColor,
        }),
        datalabels: ThemeColor.extend({
            display: z.boolean(),
        }),
        cumulatedPnlChart: z.object({
            bar: ThemeColor,
            point: ThemeColor,
        }),
        apptChart: z.object({
            bar: ThemeColor,
            movingAverage: ThemeColor,
        }),
        plRatioChart: z.object({
            bar: ThemeColor,
            movingAverage: ThemeColor,
        }),
        winrateChart: z.object({
            bar: ThemeColor,
            movingAverage: ThemeColor,
        }),
        pnlBarChart: z.object({
            profit: ThemeColor,
            loss: ThemeColor,
            breakeven: ThemeColor,
        }),
        tradeTypeBadges: z.object({
            buy: ThemeColor,
            sell: ThemeColor,
        }),
    }).default({
        tableRowHover: { light: '#e5e5e5', dark: '#374151', 'light-blue': '#e5e5e5', 'dark-gold': '#374151' },
        pnlchart: {
            line: { light: '#38bdf8', dark: '#38bdf8', 'light-blue': '#38bdf8', 'dark-gold': '#38bdf8' },
            point: { light: '#094bff', dark: '#094bff', 'light-blue': '#094bff', 'dark-gold': '#094bff' },
        },
        datalabels: {
            display: false,
            light: '#333333',
            dark: '#ffffff',
            'light-blue': '#333333',
            'dark-gold': '#ffffff',
        },
        cumulatedPnlChart: {
            bar: { light: '#38bdf8', dark: '#38bdf8', 'light-blue': '#38bdf8', 'dark-gold': '#38bdf8' },
            point: { light: '#444', dark: '#e79a0b', 'light-blue': '#444', 'dark-gold': '#e79a0b' },
        },
        apptChart: {
            bar: { light: '#4ade80', dark: '#4ade80', 'light-blue': '#4ade80', 'dark-gold': '#4ade80' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)', 'light-blue': '#444', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        plRatioChart: {
            bar: { light: '#f59e0b', dark: '#f59e0b', 'light-blue': '#f59e0b', 'dark-gold': '#f59e0b' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)', 'light-blue': '#444', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        winrateChart: {
            bar: { light: '#ccba18', dark: '#ccba18', 'light-blue': '#ccba18', 'dark-gold': '#ccba18' },
            movingAverage: { light: '#444', dark: 'rgb(52, 128, 204)', 'light-blue': '#444', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        pnlBarChart: {
            profit: { light: 'rgba(34, 197, 94, 0.8)', dark: 'rgba(34, 197, 94, 0.8)', 'light-blue': 'rgba(34, 197, 94, 0.8)', 'dark-gold': 'rgba(34, 197, 94, 0.8)' },
            loss: { light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(239, 68, 68, 0.8)', 'light-blue': 'rgba(239, 68, 68, 0.8)', 'dark-gold': 'rgba(239, 68, 68, 0.8)' },
            breakeven: { light: 'rgba(156, 163, 175, 0.8)', dark: 'rgba(156, 163, 175, 0.8)', 'light-blue': 'rgba(156, 163, 175, 0.8)', 'dark-gold': 'rgba(156, 163, 175, 0.8)' },
        },
        tradeTypeBadges: {
            buy: { light: '#10b981', dark: '#21c65e', 'light-blue': '#10b981', 'dark-gold': '#21c65e' },
            sell: { light: '#f97316', dark: '#e27373', 'light-blue': '#f97316', 'dark-gold': '#e27373' },
        },
    }),
})

export type SettingsContentType = z.infer<typeof SettingsContentSchema>

// État des paramètres par défaut - généré automatiquement à partir du schéma
export const defaultSettings: SettingsContentType = SettingsContentSchema.parse({})
