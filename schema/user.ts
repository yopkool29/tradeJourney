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
    syncAccountSelection: z.boolean().default(false),
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
        tableRowHover: { light: 'rgb(229, 229, 229)', dark: 'rgb(55, 65, 81)', 'light-blue': 'rgb(229, 229, 229)', 'dark-gold': 'rgb(55, 65, 81)' },
        pnlchart: {
            line: { light: 'rgb(56, 189, 248)', dark: 'rgb(56, 189, 248)', 'light-blue': 'rgb(56, 189, 248)', 'dark-gold': 'rgb(56, 189, 248)' },
            point: { light: 'rgb(200, 75, 255)', dark: 'rgb(150, 75, 255)', 'light-blue': 'rgb(200, 75, 255)', 'dark-gold': 'rgb(150, 75, 255)' },
        },
        datalabels: {
            display: false,
            light: 'rgb(51, 51, 51)',
            dark: 'rgb(255, 255, 255)',
            'light-blue': 'rgb(51, 51, 51)',
            'dark-gold': 'rgb(255, 255, 255)',
        },
        cumulatedPnlChart: {
            bar: { light: 'rgb(56, 189, 248)', dark: 'rgb(56, 189, 248)', 'light-blue': 'rgb(56, 189, 248)', 'dark-gold': 'rgb(56, 189, 248)' },
            point: { light: 'rgb(68, 68, 68)', dark: 'rgb(231, 154, 11)', 'light-blue': 'rgb(68, 68, 68)', 'dark-gold': 'rgb(231, 154, 11)' },
        },
        apptChart: {
            bar: { light: 'rgb(74, 222, 128)', dark: 'rgb(74, 222, 128)', 'light-blue': 'rgb(74, 222, 128)', 'dark-gold': 'rgb(74, 222, 128)' },
            movingAverage: { light: 'rgb(68, 68, 68)', dark: 'rgb(52, 128, 204)', 'light-blue': 'rgb(68, 68, 68)', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        plRatioChart: {
            bar: { light: 'rgb(245, 158, 11)', dark: 'rgb(245, 158, 11)', 'light-blue': 'rgb(245, 158, 11)', 'dark-gold': 'rgb(245, 158, 11)' },
            movingAverage: { light: 'rgb(68, 68, 68)', dark: 'rgb(52, 128, 204)', 'light-blue': 'rgb(68, 68, 68)', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        winrateChart: {
            bar: { light: 'rgb(204, 186, 24)', dark: 'rgb(204, 186, 24)', 'light-blue': 'rgb(204, 186, 24)', 'dark-gold': 'rgb(204, 186, 24)' },
            movingAverage: { light: 'rgb(68, 68, 68)', dark: 'rgb(52, 128, 204)', 'light-blue': 'rgb(68, 68, 68)', 'dark-gold': 'rgb(52, 128, 204)' },
        },
        pnlBarChart: {
            profit: { light: 'rgba(34, 197, 94, 0.8)', dark: 'rgba(34, 197, 94, 0.8)', 'light-blue': 'rgba(34, 197, 94, 0.8)', 'dark-gold': 'rgba(34, 197, 94, 0.8)' },
            loss: { light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(239, 68, 68, 0.8)', 'light-blue': 'rgba(239, 68, 68, 0.8)', 'dark-gold': 'rgba(239, 68, 68, 0.8)' },
            breakeven: { light: 'rgb(252, 223, 146)', dark: 'rgb(158, 138, 83)', 'light-blue': 'rgb(252, 223, 146)', 'dark-gold': 'rgb(158, 138, 83)' },
        },
        tradeTypeBadges: {
            buy: { light: 'rgb(16, 185, 129)', dark: 'rgb(33, 198, 94)', 'light-blue': 'rgb(16, 185, 129)', 'dark-gold': 'rgb(33, 198, 94)' },
            sell: { light: 'rgb(249, 115, 22)', dark: 'rgb(226, 115, 115)', 'light-blue': 'rgb(249, 115, 22)', 'dark-gold': 'rgb(226, 115, 115)' },
        },
    }),
})

export type SettingsContentType = z.infer<typeof SettingsContentSchema>

// État des paramètres par défaut - généré automatiquement à partir du schéma
export const defaultSettings: SettingsContentType = SettingsContentSchema.parse({})
