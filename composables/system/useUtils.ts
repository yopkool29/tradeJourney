import { formatCurrency as formatCurrencyUtil } from '~/utils'

export const useUtils = () => {
    const formatCurrency = (value: number | string, decimals: number = 2): string => {
        return formatCurrencyUtil(value, decimals, 'USD')
    }

    return {
        formatCurrency,
    }
}

// Theme switcher with loading state
export const useThemeSwitcher = () => {
    const colorMode = useColorMode()
    const themeLoading = ref(false)
    const pendingTheme = ref<string | null>(null)
    let themeLoadingTimeout: ReturnType<typeof setTimeout> | null = null

    // Watch for actual theme change to stop spinner
    watch(() => colorMode.value, (newValue) => {
        if (pendingTheme.value && newValue === pendingTheme.value) {
            themeLoading.value = false
            pendingTheme.value = null
            if (themeLoadingTimeout) {
                clearTimeout(themeLoadingTimeout)
                themeLoadingTimeout = null
            }
        }
    })

    const setTheme = (theme: string) => {
        if (colorMode.value === theme) return
        themeLoading.value = true
        pendingTheme.value = theme

        // Remove old theme classes to prevent accumulation (dark-gold, light-blue, etc.)
        const html = document.documentElement
        ;['dark-gold', 'light-blue'].forEach(cls => html.classList.remove(cls))

        // Failsafe: stop spinner after 3s max
        themeLoadingTimeout = setTimeout(() => {
            themeLoading.value = false
            pendingTheme.value = null
            themeLoadingTimeout = null
        }, 3000)

        setTimeout(() => {
            colorMode.preference = theme
        }, 50)
    }

    return {
        themeLoading,
        setTheme,
    }
}

// Language switcher with loading state
export const useLanguageSwitcher = () => {
    const languageLoading = ref(false)
    let languageLoadingTimeout: ReturnType<typeof setTimeout> | null = null
    const { locale, setLocale } = useI18n()

    const setLanguage = (lang: 'fr' | 'en') => {
        if (locale.value === lang) return
        languageLoading.value = true

        // Failsafe: stop spinner after 3s max
        languageLoadingTimeout = setTimeout(() => {
            languageLoading.value = false
            languageLoadingTimeout = null
        }, 3000)

        setTimeout(async () => {
            await setLocale(lang)
            localStorage.setItem('i18n-locale', lang)
            languageLoading.value = false
            if (languageLoadingTimeout) {
                clearTimeout(languageLoadingTimeout)
                languageLoadingTimeout = null
            }
        }, 50)
    }

    const toggleLanguage = () => {
        const newLang = locale.value === 'fr' ? 'en' : 'fr'
        setLanguage(newLang as 'fr' | 'en')
    }

    return {
        languageLoading,
        setLanguage,
        toggleLanguage,
    }
}
