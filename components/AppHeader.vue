<template>
    <header v-show="!hideHeader"
        class="w-full shadow bg-default dark:bg-gray-900 text-gray-900 dark:text-white select-none">
        <div>
            <div class="container mx-auto flex justify-between items-center py-4 px-4">
                <div class="flex items-center gap-6">
                    <div class="font-bold text-lg">
                        <NuxtLink to="/" class="relative">
                            <AppLogo :width="150" />
                            <span v-if="isDevMode"
                                class="absolute -bottom-3 -right-1 text-[10px] font-bold text-blue-500 dark:text-red-500 uppercase tracking-wide">
                                dev
                            </span>
                        </NuxtLink>
                    </div>
                    <!-- Database Indicator (clickable) -->
                    <button v-if="userStore.user && currentDatabase"
                        class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-all duration-200 ease-out hover:scale-105 focus-visible:scale-105 cursor-pointer"
                        @click="navigateTo('/select-database')">
                        <UIcon name="i-heroicons-circle-stack" class="w-4 h-4 text-primary" />
                        <span class="text-sm font-medium text-primary">{{
                            currentDatabase.displayName }}</span>
                    </button>
                    <nav v-if="userStore.user && currentDatabase" class="hidden lg:flex w-full items-center gap-x-2">
                        <NuxtLink :to="menuItems[0].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[0].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium hidden xl:inline">{{ menuItems[0].label }}</span>
                        </NuxtLink>
                        <NuxtLink :to="menuItems[1].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[1].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium hidden xl:inline">{{ menuItems[1].label }}</span>
                        </NuxtLink>
                        <NuxtLink :to="menuItems[2].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[2].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium hidden xl:inline">{{ menuItems[2].label }}</span>
                        </NuxtLink>
                        <NuxtLink :to="menuItems[3].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[3].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium hidden xl:inline">{{ menuItems[3].label }}</span>
                        </NuxtLink>
                        <NuxtLink :to="menuItems[4].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[4].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium">{{ menuItems[4].label }}</span>
                        </NuxtLink>
                        <NuxtLink :to="menuItems[5].to" class="header-desktop-link"
                            active-class="header-desktop-link-active">
                            <UIcon :name="menuItems[5].icon" class="header-icon mb-1 transition-colors" />
                            <span class="font-medium">{{ menuItems[5].label }}</span>
                        </NuxtLink>
                        <div v-if="displayLog">
                            <button class="header-desktop-link cursor-pointer" @click.prevent="onLogActivity()">
                                <UIcon :name="menuItems[7].icon" class="header-icon mb-1 transition-colors" />
                                <span class="font-medium">{{ menuItems[7].label }}</span>
                            </button>
                        </div>
                    </nav>
                </div>
                <div class="flex items-center">
                    <!-- GitHub Button -->
                    <a href="https://github.com/yopkool29/pnltracker" target="_blank" rel="noopener noreferrer"
                        class="hidden md:flex items-center px-2 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="GitHub">
                        <span class="w-5 h-5 shrink-0">
                            <img src="/img/social/github.svg" alt="GitHub"
                                class="w-full h-full object-cover rounded-sm dark:invert" />
                        </span>
                    </a>
                    <!-- Documentation Button -->
                    <a :href="`https://doc.pnltracker.app/${locale}`" target="_blank" rel="noopener noreferrer"
                        class="hidden md:flex items-center px-2 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        :title="$t('components.app_header.documentation')">
                        <UIcon name="i-heroicons-book-open" class="w-5 h-5" />
                    </a>
                    <!-- Language Switcher Button -->
                    <UButton
                        variant="ghost"
                        class="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg"
                        :loading="languageLoading"
                        @click="toggleLanguage"
                    >
                        <span v-if="!languageLoading">
                            <img v-if="locale === 'fr'" src="/img/flags/fr.svg" alt="Drapeau français" class="min-w-5 w-5 h-5 object-cover rounded-sm" />
                            <img v-else src="/img/flags/en.svg" alt="English flag" class="min-w-5 w-5 h-5 object-cover rounded-sm" />
                        </span>
                        <span v-if="!languageLoading" class="font-medium">{{ $t('language.switch') }}</span>
                        <span v-else class="font-medium">{{ $t('language.switch') }}</span>
                    </UButton>

                    <UDropdownMenu :items="themeItems">
                        <UButton variant="ghost" class="p-2 rounded-full flex items-center gap-2" :loading="themeLoading">
                            <UIcon v-if="!themeLoading" :name="themeIcon" class="header-icon" />
                            <span v-if="!themeLoading" class="hidden md:inline text-sm">{{ themeLabel }}</span>
                            <span v-else class="hidden md:inline text-sm">{{ themeLabel }}</span>
                        </UButton>
                    </UDropdownMenu>
                    <UButton v-if="userStore.user" color="primary" variant="ghost" class="ml-2 hidden md:inline-flex"
                        :title="$t('components.app_header.logout')" @click="onLogout">
                        <UIcon name="i-heroicons-arrow-left-on-rectangle" class="header-icon" />
                    </UButton>
                    <!-- Menu mobile simple -->
                    <UButton color="neutral" variant="ghost" class="rounded-full lg:hidden"
                        @click="mobileMenuOpen = !mobileMenuOpen">
                        <UIcon :name="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
                            class="header-icon" />
                    </UButton>
                    <!-- Overlay menu mobile -->
                    <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 bg-gray-900/50 lg:hidden"
                        @click="mobileMenuOpen = false" />
                    <div v-if="mobileMenuOpen"
                        class="fixed right-0 top-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg p-4 transform lg:hidden">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-medium">{{ $t('components.app_header.menu') }}</h3>
                            <UButton color="neutral" variant="ghost" class="p-1 rounded-full"
                                @click="mobileMenuOpen = false">
                                <UIcon name="i-heroicons-x-mark" class="header-icon" />
                            </UButton>
                        </div>
                        <nav class="flex flex-col space-y-2">
                            <template v-if="currentDatabase">
                                <NuxtLink :to="menuItems[0].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[0].icon" class="header-menu-icon" />
                                    {{ menuItems[0].label }}
                                </NuxtLink>

                                <NuxtLink :to="menuItems[1].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[1].icon" class="header-menu-icon" />
                                    {{ menuItems[1].label }}
                                </NuxtLink>

                                <NuxtLink :to="menuItems[2].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[2].icon" class="header-menu-icon" />
                                    {{ menuItems[2].label }}
                                </NuxtLink>

                                <NuxtLink :to="menuItems[3].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[3].icon" class="header-menu-icon" />
                                    {{ menuItems[3].label }}
                                </NuxtLink>

                                <NuxtLink :to="menuItems[4].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[4].icon" class="header-menu-icon" />
                                    {{ menuItems[4].label }}
                                </NuxtLink>

                                <NuxtLink :to="menuItems[5].to" class="header-mobile-link"
                                    active-class="header-mobile-link-active" @click="mobileMenuOpen = false">
                                    <UIcon :name="menuItems[5].icon" class="header-menu-icon" />
                                    {{ menuItems[5].label }}
                                </NuxtLink>
                            </template>

                            <!-- Menu Log (always visible in dev mode) -->
                            <li v-if="displayLog" class="header-mobile-link cursor-pointer" @click="onLogActivity()">
                                <UIcon :name="menuItems[7].icon" class="header-menu-icon" />
                                {{ menuItems[7].label }}
                            </li>

                            <!-- GitHub Link -->
                            <a href="https://github.com/yopkool29/pnltracker" target="_blank"
                                rel="noopener noreferrer" class="header-mobile-link">
                                <span class="w-5 h-5 shrink-0 mr-3">
                                    <img src="/img/social/github.svg" alt="GitHub"
                                        class="w-full h-full object-cover rounded-sm dark:invert" />
                                </span>
                                GitHub
                            </a>

                            <!-- Documentation Link -->
                            <a :href="`https://doc.pnltracker.app/${locale}`" target="_blank"
                                rel="noopener noreferrer" class="header-mobile-link">
                                <UIcon name="i-heroicons-book-open" class="header-menu-icon" />
                                {{ $t('components.app_header.documentation') }}
                            </a>

                            <!-- Language Switcher -->
                            <li class="header-mobile-link cursor-pointer" @click="toggleLanguage">
                                <span v-if="locale === 'fr'" class="w-5 h-5 shrink-0 mr-3">
                                    <img src="/img/flags/fr.svg" alt="Drapeau français"
                                        class="w-full h-full object-cover rounded-sm" />
                                </span>
                                <span v-else class="w-5 h-5 shrink-0 mr-3">
                                    <img src="/img/flags/en.svg" alt="English flag"
                                        class="w-full h-full object-cover rounded-sm" />
                                </span>
                                {{ $t('language.switch') }}
                            </li>

                            <!-- Déconnexion -->
                            <li v-if="userStore.user" class="header-mobile-link mt-2" @click="onLogout()">
                                <UIcon name="i-heroicons-arrow-left-on-rectangle" class="header-menu-icon" /> {{
                                    $t('components.app_header.logout')
                                }}
                            </li>
                        </nav>
                    </div>
                </div>
            </div>
            <div v-if="userStore.user && currentDatabase"
                class="w-full flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <div class="container mx-auto py-4 px-4 flex items-center gap-4">
                    <QuickNav class="hidden lg:block" v-if="userStore.user.settings_object?.showQuickNav" />
                    <NetGrossToggle v-model="userStore.displayModeNet" />
                    <DetailedNoteToggle />
                </div>
            </div>
            <div class="container mx-auto flex justify-between items-center px-4">
                <LogView ref="myLogView" class="w-full" />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import type { ILogView } from '~/type'

const myLogView = useState<ILogView | null>('myLogView', () => null)
const hideHeader = useState<boolean>('hideHeader', () => false)
const colorMode = useColorMode()
const userStore = useUserStore()
const { logout } = useAuth()
const { locale, t } = useI18n()
const { currentDatabase, clearCurrentDatabase } = useDatabase()
const router = useRouter()
const config = useRuntimeConfig()
const { themeLoading, setTheme } = useThemeSwitcher()
const { languageLoading, toggleLanguage } = useLanguageSwitcher()

const mobileMenuOpen = ref(false)

const displayLog = ref(config.public.showLogView)

// Vérification périodique de la session
const { startSessionCheck, stopSessionCheck } = useSessionCheck()

// Démarrer la vérification quand le composant est monté et qu'un utilisateur est connecté
onMounted(() => {
    if (userStore.user) {
        startSessionCheck()
    }
})

// Surveiller les changements d'utilisateur pour démarrer/arrêter la vérification
watch(() => userStore.user, (newUser) => {
    if (newUser) {
        startSessionCheck()
    } else {
        stopSessionCheck()
    }
})

const isDevMode = computed(() => import.meta.env.DEV)

const isDark = useIsDark()

const themeIcon = computed(() => {
    switch (colorMode.value) {
        case 'dark': return 'i-heroicons-moon'
        case 'light-blue': return 'i-heroicons-sparkles'
        case 'dark-gold': return 'i-heroicons-star'
        default: return 'i-heroicons-sun'
    }
})

const themeLabels: Record<string, string> = {
    'light': 'Light',
    'light-blue': 'Light Blue',
    'dark': 'Dark',
    'dark-gold': 'Dark Gold',
}

const themeLabel = computed(() => themeLabels[colorMode.value] ?? colorMode.value)


const themeItems = computed(() => [
    [{
        label: 'Light',
        icon: 'i-heroicons-sun',
        onSelect: () => setTheme('light')
    }, {
        label: 'Light Blue',
        icon: 'i-heroicons-sparkles',
        onSelect: () => setTheme('light-blue')
    }, {
        label: 'Dark',
        icon: 'i-heroicons-moon',
        onSelect: () => setTheme('dark')
    }, {
        label: 'Dark Gold',
        icon: 'i-heroicons-star',
        onSelect: () => setTheme('dark-gold')
    }]
])

const onLogout = async () => {
    mobileMenuOpen.value = false
    await logout()
    await router.push('/login')
    clearCurrentDatabase()
}

const menuItems = computed(() => [
    {
        label: t('components.app_header.menu_items.dashboard'),
        icon: 'i-lucide-chart-bar',
        to: '/dashboard',
    },
    {
        label: t('pages.trades.tabs.calendar'),
        icon: 'i-lucide-calendar',
        to: '/calendar',
    },
    {
        label: t('pages.trades.tabs.daily'),
        icon: 'i-lucide-calendar-days',
        to: '/daily',
    },
    {
        label: t('pages.trades.tabs.trades'),
        icon: 'i-heroicons-chart-bar',
        to: '/main',
    },
    {
        label: t('pages.trades.tabs.import'),
        icon: 'i-lucide-import',
        to: '/import',
    },
    {
        label: t('components.app_header.menu_items.settings'),
        icon: 'i-heroicons-cog-6-tooth',
        to: '/settings',
    },
    {
        label: t('components.app_header.menu_items.test'),
        icon: 'i-heroicons-document-text',
        to: '/test',
    },
    {
        label: t('components.app_header.menu_items.log'),
        icon: 'i-heroicons-document-text',
        to: '#',
        onClick: 'onLogActivity',
    },
])


const onLogActivity = () => {
    mobileMenuOpen.value = false
    if (myLogView.value) {
        const logView = myLogView.value as ILogView

        if (logView.isOpen()) logView.onClose()
        else logView.onOpen()
    }
}

// Logout if database is deselected (transition from selected to null)
watch(
    () => currentDatabase.value,
    (newValue, oldValue) => {
        if (!newValue && oldValue && userStore.user) {
            onLogout()
        }
    }
)
</script>
