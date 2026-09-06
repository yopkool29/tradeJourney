import { z } from 'zod'
import { idField } from './primitives'

// Reusable theme color type for 4 themes
const ThemeColor = z.object({
    light: z.string(),
    dark: z.string(),
    'light-blue': z.string(),
    'dark-gold': z.string(),
})

export const UserSchema = z.object({
    id: idField,
    email: z.string(),
    token: z.string().optional(),
    settings: z.string(),
    settings_object: z.record(z.any()).optional().nullable(),
})

export type UserType = z.infer<typeof UserSchema>

export const SettingsSchema = z.object({
    settings: z.string(),
})

export const ChangeEmailSchema = z.object({
    currentPassword: z.string().min(1),
    email: z.string().email(),
})

export type ChangeEmailType = z.infer<typeof ChangeEmailSchema>

export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(5),
    confirmPassword: z.string().min(5),
}).refine(data => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    params: { i18n: 'components.settings.security.password_mismatch' },
})

export type ChangePasswordType = z.infer<typeof ChangePasswordSchema>

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
    showTradeChart: z.boolean().default(true),
    showDetailedNote: z.boolean().default(true),
    polygonApiKey: z.string().default(''),
    polygonRequestDelayMs: z.number().default(12000),
    polygonCacheRefreshMinutes: z.number().default(1440),
    // Regular Trading Hours (RTH) per instrument type.
    // open/close are "HH:MM" in the given IANA timezone.
    // Forex and crypto trade near 24/7 so they have no RTH session.
    rthSessions: z.object({
        stock: z.object({ open: z.string(), close: z.string(), timezone: z.string() }).default({ open: '09:30', close: '16:00', timezone: 'America/New_York' }),
        future: z.object({ open: z.string(), close: z.string(), timezone: z.string() }).default({ open: '08:30', close: '15:00', timezone: 'America/Chicago' }),
        option: z.object({ open: z.string(), close: z.string(), timezone: z.string() }).default({ open: '09:30', close: '16:00', timezone: 'America/New_York' }),
        any: z.object({ open: z.string(), close: z.string(), timezone: z.string() }).default({ open: '09:30', close: '16:00', timezone: 'America/New_York' }),
    }).default({}),
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
        timeSeriesChart: z.object({
            bar: ThemeColor,
            movingAverage: ThemeColor,
            rawMetric: ThemeColor,
        }),
        pnlBarChart: z.object({
            profit: ThemeColor,
            loss: ThemeColor,
            breakeven: ThemeColor,
        }),
        heatmap: z.object({
            min: ThemeColor,
            max: ThemeColor,
        }),
        scatter2D: z.object({
            min: ThemeColor,
            mid: ThemeColor,
            max: ThemeColor,
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
        timeSeriesChart: {
            bar: { light: 'rgb(204, 186, 24)', dark: 'rgb(204, 186, 24)', 'light-blue': 'rgb(204, 186, 24)', 'dark-gold': 'rgb(204, 186, 24)' },
            movingAverage: { light: 'rgb(52, 128, 204)', dark: 'rgb(52, 128, 204)', 'light-blue': 'rgb(52, 128, 204)', 'dark-gold': 'rgb(52, 128, 204)' },
            rawMetric: { light: 'rgb(59, 130, 246)', dark: 'rgb(59, 130, 246)', 'light-blue': 'rgb(59, 130, 246)', 'dark-gold': 'rgb(59, 130, 246)' },
        },
        pnlBarChart: {
            profit: { light: 'rgba(34, 197, 94, 0.8)', dark: 'rgba(34, 197, 94, 0.8)', 'light-blue': 'rgba(34, 197, 94, 0.8)', 'dark-gold': 'rgba(34, 197, 94, 0.8)' },
            loss: { light: 'rgba(239, 68, 68, 0.8)', dark: 'rgba(239, 68, 68, 0.8)', 'light-blue': 'rgba(239, 68, 68, 0.8)', 'dark-gold': 'rgba(239, 68, 68, 0.8)' },
            breakeven: { light: 'rgb(252, 223, 146)', dark: 'rgb(158, 138, 83)', 'light-blue': 'rgb(252, 223, 146)', 'dark-gold': 'rgb(158, 138, 83)' },
        },
        heatmap: {
            min: { light: 'rgb(255, 245, 204)', dark: 'rgb(42, 21, 0)', 'light-blue': 'rgb(255, 245, 204)', 'dark-gold': 'rgb(42, 21, 0)' },
            max: { light: 'rgb(255, 128, 0)', dark: 'rgb(255, 170, 51)', 'light-blue': 'rgb(255, 128, 0)', 'dark-gold': 'rgb(255, 170, 51)' },
        },
        scatter2D: {
            min: { light: 'rgb(243, 244, 246)', dark: 'rgb(31, 41, 55)', 'light-blue': 'rgb(243, 244, 246)', 'dark-gold': 'rgb(31, 41, 55)' },
            mid: { light: 'rgb(147, 197, 253)', dark: 'rgb(30, 64, 175)', 'light-blue': 'rgb(147, 197, 253)', 'dark-gold': 'rgb(30, 64, 175)' },
            max: { light: 'rgb(22, 163, 74)', dark: 'rgb(34, 197, 94)', 'light-blue': 'rgb(22, 163, 74)', 'dark-gold': 'rgb(34, 197, 94)' },
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
