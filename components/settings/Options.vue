<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="header-layout">
                <span class="section-title">{{ $t('components.settings.options.title') }}</span>
            </div>
        </template>
        <div class="p-4">
            <p class="text-secondary mb-6">{{ $t('components.settings.options.description') }}</p>

            <div>
                <div class="space-y-6">
                    <!-- Section Interface -->
                    <div class="section-separator">
                        <h3 class="section-subtitle-lg">{{ $t('components.settings.options.interface_section') }}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <UFormField name="noteNewline" class="w-full">
                                <UCheckbox
                                    v-model="formState.deleteConfirmationTrade"
                                    :label="$t('components.settings.options.delete_confirmation_trade')"
                                    :description="$t('components.settings.options.delete_confirmation_trade_desc')"
                                />
                            </UFormField>
                            <UFormField name="noteNewline" class="w-full">
                                <UCheckbox
                                    v-model="formState.deleteConfirmationNoteTags"
                                    :label="$t('components.settings.options.delete_confirmation_notes')"
                                    :description="$t('components.settings.options.delete_confirmation_notes_desc')"
                                />
                            </UFormField>
                            <UFormField name="showCalendarDaily" class="w-full">
                                <UCheckbox
                                    v-model="formState.showCalendarDaily"
                                    :label="$t('components.settings.options.show_calendar_daily')"
                                    :description="$t('components.settings.options.show_calendar_daily_desc')"
                                />
                            </UFormField>
                            <UFormField name="showCalendarCalendar" class="w-full">
                                <UCheckbox
                                    v-model="formState.showCalendarCalendar"
                                    :label="$t('components.settings.options.show_calendar_calendar')"
                                    :description="$t('components.settings.options.show_calendar_calendar_desc')"
                                />
                            </UFormField>
                            <UFormField name="autoDataSync" class="w-full">
                                <UCheckbox
                                    v-model="formState.autoDataSync"
                                    :label="$t('components.settings.options.auto_data_sync')"
                                    :description="$t('components.settings.options.auto_data_sync_desc')"
                                />
                            </UFormField>
                            <UFormField name="showQuickNav" class="w-full">
                                <UCheckbox
                                    v-model="formState.showQuickNav"
                                    :label="$t('components.settings.options.show_quick_nav')"
                                    :description="$t('components.settings.options.show_quick_nav_desc')"
                                />
                            </UFormField>
                        </div>
                    </div>

                    <!-- Section Tableau de bord -->
                    <div class="section-separator">
                        <h3 class="section-subtitle-lg">{{ $t('components.settings.options.dashboard_section') }}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <UFormField name="pnlThreshold" :label="$t('components.settings.options.pnl_threshold')" class="w-full">
                                <UInput
                                    v-model.number="formState.pnlThreshold"
                                    type="number"
                                    :placeholder="'0'"
                                    min="0"
                                    step="0.1"
                                />
                                <template #description>
                                    <span class="text-sm text-secondary">{{ $t('components.settings.options.pnl_threshold_desc') }}</span>
                                </template>
                            </UFormField>
                        </div>
                    </div>

                    <!-- Section API NinjaTrader -->
                    <div class="section-separator">
                        <h3 class="section-subtitle-lg">{{ $t('components.settings.options.ninja_api_section') }}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <UFormField name="ninjaTraderApiPort" :label="$t('components.settings.options.ninja_api_port')" class="w-full">
                                <UInput
                                    v-model.number="formState.ninjaTraderApiPort"
                                    type="number"
                                    :placeholder="'8080'"
                                    min="1024"
                                    max="65535"
                                />
                                <template #description>
                                    <span class="text-sm text-secondary">{{ $t('components.settings.options.ninja_api_port_desc') }}</span>
                                </template>
                            </UFormField>
                            <UFormField name="ninjaTraderApiDays" :label="$t('components.settings.options.ninja_api_days')" class="w-full">
                                <UInput
                                    v-model.number="formState.ninjaTraderApiDays"
                                    type="number"
                                    :placeholder="'1'"
                                    min="1"
                                    max="365"
                                />
                                <template #description>
                                    <span class="text-sm text-secondary">{{ $t('components.settings.options.ninja_api_days_desc') }}</span>
                                </template>
                            </UFormField>
                        </div>
                    </div>

                    <!-- Section Fuseau horaire pour l'affichage -->
                    <div class="section-separator">
                        <h3 class="section-subtitle-lg">{{ $t('components.settings.options.timezone_display_section') }}</h3>
                        <div class="flex flex-col gap-8">
                            <UFormField name="timezoneDisplay" :label="$t('components.settings.options.timezone_display_mode')" class="w-64">
                                <USelect
                                    v-model="formState.timezoneDisplay"
                                    :items="timezoneDisplayOptions"
                                />
                                <template #description>
                                    <span class="text-sm text-secondary">{{ $t('components.settings.options.timezone_display_mode_desc') }}</span>
                                </template>
                            </UFormField>

                            <!-- Option LOCAL: sélection de fuseau horaire IANA -->
                            <div v-if="formState.timezoneDisplay === 'LOCAL'" class="pl-4 border-l-2 border-primary">
                                <UFormField name="timezoneLocal" :label="$t('components.settings.options.timezone_local')" class="w-96">
                                    <USelect
                                        v-model="formState.timezoneLocal"
                                        :items="ianaTimezones"
                                        searchable
                                        size="lg"
                                        class="min-w-[200px]"
                                    />
                                    <template #description>
                                        <span class="text-sm text-secondary">{{ $t('components.settings.options.timezone_local_desc') }}</span>
                                    </template>
                                </UFormField>
                            </div>

                            <!-- Option UTC: sélection d'offset -->
                            <div v-if="formState.timezoneDisplay === 'UTC'" class="pl-4 border-l-2 border-primary">
                                <UFormField name="timezoneUtcOffset" :label="$t('components.settings.options.timezone_utc_offset')" class="w-64">
                                    <USelect
                                        v-model.number="formState.timezoneUtcOffset"
                                        :items="utcOffsetOptions"
                                    />
                                    <template #description>
                                        <span class="text-sm text-secondary">{{ $t('components.settings.options.timezone_utc_offset_desc') }}</span>
                                    </template>
                                </UFormField>
                            </div>

                            <!-- Option CURRENT: info -->
                            <div v-if="formState.timezoneDisplay === 'CURRENT'" class="pl-4 border-l-2 border-primary">
                                <p class="text-sm text-secondary">{{ $t('components.settings.options.timezone_current_desc') }}</p>
                                <p class="text-sm font-medium mt-2">{{ $t('components.settings.options.timezone_current_detected') }}: {{ detectedTimezone }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Section Couleurs des graphiques -->
                    <div class="section-separator">
                        <h3 class="section-subtitle-lg">{{ $t('components.settings.options.chart_colors_section') }}</h3>
                        
                        <!-- P&L Bar Chart -->
                        <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.pnl_bar_chart') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_profit')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.profit.light"
                                        :label="$t('components.settings.options.color_profit')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.profit.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_profit')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.profit.dark"
                                        :label="$t('components.settings.options.color_profit')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.profit.dark"
                                    />
                                </UFormField>
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_loss')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.loss.light"
                                        :label="$t('components.settings.options.color_loss')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.loss.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_loss')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.loss.dark"
                                        :label="$t('components.settings.options.color_loss')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.loss.dark"
                                    />
                                </UFormField>
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_breakeven')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.breakeven.light"
                                        :label="$t('components.settings.options.color_breakeven')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.breakeven.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_breakeven')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.pnlBarChart.breakeven.dark"
                                        :label="$t('components.settings.options.color_breakeven')"
                                        :default-color="defaultSettings.chartColors!.pnlBarChart.breakeven.dark"
                                    />
                                </UFormField>
                            </div>
                        </div>

                        <!-- Trade Type Badges -->
                        <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.trade_type_badges') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_buy')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.tradeTypeBadges!.buy.light"
                                        :label="$t('components.settings.options.color_buy')"
                                        :default-color="defaultSettings.chartColors!.tradeTypeBadges!.buy.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_buy')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.tradeTypeBadges!.buy.dark"
                                        :label="$t('components.settings.options.color_buy')"
                                        :default-color="defaultSettings.chartColors!.tradeTypeBadges!.buy.dark"
                                    />
                                </UFormField>
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_sell')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.tradeTypeBadges!.sell.light"
                                        :label="$t('components.settings.options.color_sell')"
                                        :default-color="defaultSettings.chartColors!.tradeTypeBadges!.sell.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_sell')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.tradeTypeBadges!.sell.dark"
                                        :label="$t('components.settings.options.color_sell')"
                                        :default-color="defaultSettings.chartColors!.tradeTypeBadges!.sell.dark"
                                    />
                                </UFormField>
                            </div>
                        </div>

                        <!-- Cumulated P&L Chart -->
                        <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.chart_cumulated_pnl') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_point')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.cumulatedPnlChart.point.light"
                                        :label="$t('components.settings.options.color_point')"
                                        :default-color="defaultSettings.chartColors!.cumulatedPnlChart.point.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_point')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.cumulatedPnlChart.point.dark"
                                        :label="$t('components.settings.options.color_point')"
                                        :default-color="defaultSettings.chartColors!.cumulatedPnlChart.point.dark"
                                    />
                                </UFormField>
                            </div>
                        </div>

                        <!-- APPT Chart -->
                        <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.chart_appt') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_moving_average')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.apptChart.movingAverage.light"
                                        :label="$t('components.settings.options.color_moving_average')"
                                        :default-color="defaultSettings.chartColors!.apptChart.movingAverage.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_moving_average')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.apptChart.movingAverage.dark"
                                        :label="$t('components.settings.options.color_moving_average')"
                                        :default-color="defaultSettings.chartColors!.apptChart.movingAverage.dark"
                                    />
                                </UFormField>
                            </div>
                        </div>

                        <!-- P/L Ratio Chart -->
                        <!-- <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.chart_pl_ratio') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField :label="$t('components.settings.options.color_bar_light')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.plRatioChart.bar.light"
                                        :label="$t('components.settings.options.color_bar_light')"
                                    />
                                </UFormField>
                                <UFormField :label="$t('components.settings.options.color_bar_dark')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.plRatioChart.bar.dark"
                                        :label="$t('components.settings.options.color_bar_dark')"
                                    />
                                </UFormField>
                                <UFormField :label="$t('components.settings.options.color_moving_average_light')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.plRatioChart.movingAverage.light"
                                        :label="$t('components.settings.options.color_moving_average_light')"
                                    />
                                </UFormField>
                                <UFormField :label="$t('components.settings.options.color_moving_average_dark')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.plRatioChart.movingAverage.dark"
                                        :label="$t('components.settings.options.color_moving_average_dark')"
                                    />
                                </UFormField>
                            </div>
                        </div> -->

                        <!-- Win Rate Chart -->
                        <div class="mb-6">
                            <h4 class="font-medium mb-3">{{ $t('components.settings.options.chart_winrate') }}</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_bar')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.winrateChart.bar.light"
                                        :label="$t('components.settings.options.color_bar')"
                                        :default-color="defaultSettings.chartColors!.winrateChart.bar.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_bar')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.winrateChart.bar.dark"
                                        :label="$t('components.settings.options.color_bar')"
                                        :default-color="defaultSettings.chartColors!.winrateChart.bar.dark"
                                    />
                                </UFormField>
                                <UFormField v-if="!isDark" :label="$t('components.settings.options.color_moving_average')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.winrateChart.movingAverage.light"
                                        :label="$t('components.settings.options.color_moving_average')"
                                        :default-color="defaultSettings.chartColors!.winrateChart.movingAverage.light"
                                    />
                                </UFormField>
                                <UFormField v-if="isDark" :label="$t('components.settings.options.color_moving_average')">
                                    <CommonColorPickerButton 
                                        v-model="formState.chartColors!.winrateChart.movingAverage.dark"
                                        :label="$t('components.settings.options.color_moving_average')"
                                        :default-color="defaultSettings.chartColors!.winrateChart.movingAverage.dark"
                                    />
                                </UFormField>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="action-buttons mt-8">
                    <UButton type="button" color="neutral" @click="resetSettings">{{ $t('components.settings.options.reset_button') }}</UButton>
                </div>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import type { SettingsContentType } from '~/schema/user'
import { defaultSettings } from '~/schema/user'
import { IANA_TIMEZONES, UTC_OFFSETS } from '~/utils/date-utils'

const { success: toastSuccess } = useAppToast()
const { updateSettings } = useAuth()
const userStore = useUserStore()
const { log_error } = useLogView()
const { t } = useI18n()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const formState = ref<SettingsContentType>({
  ...defaultSettings,
  timezoneDisplay: 'CURRENT',
  timezoneLocal: 'Europe/Paris',
  timezoneUtcOffset: 0,
})

// Options pour le mode d'affichage du fuseau horaire
const timezoneDisplayOptions = computed(() => [
  { label: t('components.settings.options.timezone_mode_current'), value: 'CURRENT' },
  { label: t('components.settings.options.timezone_mode_local'), value: 'LOCAL' },
  { label: t('components.settings.options.timezone_mode_utc'), value: 'UTC' },
])

// Options pour les fuseaux horaires IANA
const ianaTimezones = computed(() => IANA_TIMEZONES)

// Options pour les offsets UTC
const utcOffsetOptions = computed(() => 
  UTC_OFFSETS.map(offset => {
    const sign = offset >= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hours = String(Math.floor(absOffset)).padStart(2, '0')
    const minutes = String((absOffset % 1) * 60).padStart(2, '0')
    return {
      label: `UTC${sign}${hours}:${minutes}`,
      value: offset
    }
  })
)

// Détecter le fuseau horaire actuel du navigateur
const detectedTimezone = computed(() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Unknown'
  }
})

onMounted(() => {
    const savedSettings = userStore.user!.settings_object
    if (savedSettings) {
        try {
            formState.value = {
                ...defaultSettings,
                ...savedSettings,
                chartColors: {
                    ...defaultSettings.chartColors,
                    ...(savedSettings.chartColors || {}),
                    pnlBarChart: {
                        ...defaultSettings.chartColors!.pnlBarChart,
                        ...(savedSettings.chartColors?.pnlBarChart || {}),
                    },
                    tradeTypeBadges: {
                        ...defaultSettings.chartColors!.tradeTypeBadges,
                        ...(savedSettings.chartColors?.tradeTypeBadges || {}),
                    },
                }
            } as SettingsContentType
        } catch {
            log_error(t('components.settings.options.error_loading'))
        }
    }
    initialized = true
})

// Auto-save: persiste les changements automatiquement
let initialized = false
watch(formState, () => {
    if (!initialized) return
    const json = JSON.stringify(formState.value)
    userStore.user!.settings = json
    userStore.user!.settings_object = { ...formState.value }
    updateSettings(json)
}, { deep: true })

// Réinitialiser les paramètres de cette page uniquement
function resetSettings() {
    // Réinitialiser seulement les paramètres affichés sur cette page
    formState.value = {
        ...formState.value,
        deleteConfirmationTrade: defaultSettings.deleteConfirmationTrade,
        deleteConfirmationNoteTags: defaultSettings.deleteConfirmationNoteTags,
        showCalendarDaily: defaultSettings.showCalendarDaily,
        showCalendarCalendar: defaultSettings.showCalendarCalendar,
        autoDataSync: defaultSettings.autoDataSync,
        showQuickNav: defaultSettings.showQuickNav,
        pnlThreshold: defaultSettings.pnlThreshold,
        ninjaTraderApiPort: defaultSettings.ninjaTraderApiPort,
        ninjaTraderApiDays: defaultSettings.ninjaTraderApiDays,
        timezoneDisplay: defaultSettings.timezoneDisplay,
        timezoneLocal: defaultSettings.timezoneLocal,
        timezoneUtcOffset: defaultSettings.timezoneUtcOffset,
        chartColors: {
            cumulatedPnlChart: {
                bar: { ...defaultSettings.chartColors!.cumulatedPnlChart.bar },
                point: { ...defaultSettings.chartColors!.cumulatedPnlChart.point },
            },
            apptChart: {
                bar: { ...defaultSettings.chartColors!.apptChart.bar },
                movingAverage: { ...defaultSettings.chartColors!.apptChart.movingAverage },
            },
            plRatioChart: {
                bar: { ...defaultSettings.chartColors!.plRatioChart.bar },
                movingAverage: { ...defaultSettings.chartColors!.plRatioChart.movingAverage },
            },
            winrateChart: {
                bar: { ...defaultSettings.chartColors!.winrateChart.bar },
                movingAverage: { ...defaultSettings.chartColors!.winrateChart.movingAverage },
            },
            pnlBarChart: {
                profit: { ...defaultSettings.chartColors!.pnlBarChart.profit },
                loss: { ...defaultSettings.chartColors!.pnlBarChart.loss },
                breakeven: { ...defaultSettings.chartColors!.pnlBarChart.breakeven },
            },
            tradeTypeBadges: {
                buy: { ...defaultSettings.chartColors!.tradeTypeBadges!.buy },
                sell: { ...defaultSettings.chartColors!.tradeTypeBadges!.sell },
            },
        }
    }

    toastSuccess(t('components.settings.options.toast_reset_title'), t('components.settings.options.toast_reset_desc'))
}
</script>
