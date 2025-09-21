<template>
    <header class="w-full shadow bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div>
            <div class="container mx-auto flex justify-between items-center py-4 px-4">
                <div class="flex items-center gap-6">
                    <div class="font-bold text-lg">
                        <NuxtLink to="/">
                            <AppLogo :width="120" :height="36" />
                        </NuxtLink>
                    </div>
                    <nav v-if="userStore.user" class="hidden md:flex w-full items-center space-x-4 gap-x-8">
                        <div class="flex">
                            <NuxtLink :to="menuItems[0].to" :class="desktopLinkClass" :active-class="desktopActiveClass">
                                <UIcon :name="menuItems[0].icon" :class="[iconClass, 'inline-block mr-1']" />
                                {{ menuItems[0].label }}
                            </NuxtLink>
                            <NuxtLink :to="menuItems[1].to" :class="desktopLinkClass" :active-class="desktopActiveClass">
                                <UIcon :name="menuItems[1].icon" :class="[iconClass, 'inline-block mr-1']" />
                                {{ menuItems[1].label }}
                            </NuxtLink>
                        </div>
                        <div class="flex">
                            <NuxtLink :to="menuItems[2].to" :class="desktopLinkClass" :active-class="desktopActiveClass">
                                <UIcon :name="menuItems[2].icon" :class="[iconClass, 'inline-block mr-1']" />
                                {{ menuItems[2].label }}
                            </NuxtLink>
                            <li v-if="displayLog" class="list-none" :class="desktopLinkClass">
                                <a href="#" @click.prevent="onLogActivity()">
                                    <UIcon :name="menuItems[4].icon" :class="[iconClass, 'inline-block mr-1']" />
                                    {{ menuItems[4].label }}
                                </a>
                            </li>
                        </div>
                    </nav>
                </div>
                <div class="flex items-center gap-2">
                    <!-- GitHub Button -->
                    <a
                        href="https://github.com/yopkool29/tradeJourney"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="GitHub"
                    >
                        <span class="w-5 h-5 flex-shrink-0">
                            <img src="/img/social/github.svg" alt="GitHub" class="w-full h-full object-cover rounded-sm dark:invert" />
                        </span>
                    </a>
                    <!-- Language Switcher Button -->
                    <button
                        class="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        @click="toggleLanguage"
                    >
                        <span v-if="locale === 'fr'" class="w-5 h-5 flex-shrink-0">
                            <img src="/img/flags/fr.svg" alt="Drapeau français" class="w-full h-full object-cover rounded-sm" />
                        </span>
                        <span v-else class="w-5 h-5 flex-shrink-0">
                            <img src="/img/flags/en.svg" alt="English flag" class="w-full h-full object-cover rounded-sm" />
                        </span>
                        <span class="font-medium">{{ $t('language.switch') }}</span>
                    </button>

                    <UButton
                        variant="ghost"
                        class="p-2 rounded-full"
                        :title="isDark ? $t('components.app_header.theme.light') : $t('components.app_header.theme.dark')"
                        @click="toggleColorMode"
                    >
                        <UIcon v-if="isDark" name="i-heroicons-sun" :class="[iconClass, 'dark:text-primary-400']" />
                        <UIcon v-else name="i-heroicons-moon" :class="iconClass" />
                    </UButton>
                    <UButton
                        v-if="userStore.user"
                        color="primary"
                        variant="ghost"
                        class="ml-2 hidden md:inline-flex"
                        :title="$t('components.app_header.logout')"
                        @click="onLogout"
                    >
                        <UIcon name="i-heroicons-arrow-left-on-rectangle" :class="iconClass" />
                    </UButton>
                    <!-- Menu mobile simple -->
                    <UButton color="neutral" variant="ghost" class="rounded-full md:hidden" @click="mobileMenuOpen = !mobileMenuOpen">
                        <UIcon :name="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" :class="iconClass" />
                    </UButton>
                    <!-- Overlay menu mobile -->
                    <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 bg-gray-900/50 md:hidden" @click="mobileMenuOpen = false" />
                    <div
                        v-if="mobileMenuOpen"
                        class="fixed right-0 top-0 z-50 h-full w-64 bg-white dark:bg-gray-800 shadow-lg p-4 transform md:hidden"
                    >
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-medium">{{ $t('components.app_header.menu') }}</h3>
                            <UButton color="neutral" variant="ghost" class="p-1 rounded-full" @click="mobileMenuOpen = false">
                                <UIcon name="i-heroicons-x-mark" :class="iconClass" />
                            </UButton>
                        </div>
                        <nav class="flex flex-col space-y-2">
                            <NuxtLink
                                :to="menuItems[0].to"
                                :class="mobileLinkClass"
                                :active-class="mobileActiveClass"
                                @click="mobileMenuOpen = false"
                            >
                                <UIcon :name="menuItems[0].icon" :class="menuIconClass" />
                                {{ menuItems[0].label }}
                            </NuxtLink>

                            <NuxtLink
                                :to="menuItems[1].to"
                                :class="mobileLinkClass"
                                :active-class="mobileActiveClass"
                                @click="mobileMenuOpen = false"
                            >
                                <UIcon :name="menuItems[1].icon" :class="menuIconClass" />
                                {{ menuItems[1].label }}
                            </NuxtLink>

                            <NuxtLink
                                :to="menuItems[2].to"
                                :class="mobileLinkClass"
                                :active-class="mobileActiveClass"
                                @click="mobileMenuOpen = false"
                            >
                                <UIcon :name="menuItems[2].icon" :class="menuIconClass" />
                                {{ menuItems[2].label }}
                            </NuxtLink>

                            <!-- Menu Log -->
                            <li v-if="displayLog" :class="mobileLinkClass" @click="onLogActivity()">
                                <UIcon :name="menuItems[4].icon" :class="menuIconClass" />
                                {{ menuItems[4].label }}
                            </li>

                            <!-- GitHub Link -->
                            <a 
                                href="https://github.com/yopkool29/tradeJourney" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                :class="mobileLinkClass"
                            >
                                <span class="w-5 h-5 flex-shrink-0 mr-3">
                                    <img src="/img/social/github.svg" alt="GitHub" class="w-full h-full object-cover rounded-sm dark:invert" />
                                </span>
                                GitHub
                            </a>

                            <!-- Language Switcher -->
                            <li :class="mobileLinkClass" @click="toggleLanguage">
                                <span v-if="locale === 'fr'" class="w-5 h-5 flex-shrink-0 mr-3">
                                    <img src="/img/flags/fr.svg" alt="Drapeau français" class="w-full h-full object-cover rounded-sm" />
                                </span>
                                <span v-else class="w-5 h-5 flex-shrink-0 mr-3">
                                    <img src="/img/flags/en.svg" alt="English flag" class="w-full h-full object-cover rounded-sm" />
                                </span>
                                {{ $t('language.switch') }}
                            </li>

                            <!-- Déconnexion -->
                            <li v-if="userStore.user" :class="[mobileLinkClass, 'mt-2']" @click="onLogout()">
                                <UIcon name="i-heroicons-arrow-left-on-rectangle" :class="menuIconClass" /> {{ $t('components.app_header.logout') }}
                            </li>
                        </nav>
                    </div>
                </div>
            </div>
            <div class="container mx-auto flex justify-between items-center px-4">
                <LogView ref="myLogView" class="w-full" />
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
import type { ILogView } from '~/type'

const myLogView = useState<ILogView | null>('myLogView', () => null)
const colorMode = useColorMode()
const userStore = useUserStore()
const { logout } = useAuth()
const { locale, setLocale, t } = useI18n()

const { log_debug, log_error } = useLogView()

const mobileMenuOpen = ref(false)

const displayLog = ref(import.meta.env.DEV)

const isDark = computed(() => colorMode.value === 'dark')

// Classes communes extraites pour optimisation
const iconClass = 'w-5 h-5'
const menuIconClass = 'w-5 h-5 mr-3'

const desktopLinkClass = 'px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
const desktopActiveClass = 'text-primary-600 dark:text-primary-400 font-medium'

const mobileLinkClass = 'px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center cursor-pointer'
const mobileActiveClass = 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'

async function onLogout() {
    mobileMenuOpen.value = false
    await logout()
    window.location.href = '/login'
}

const menuItems = computed(() => [
    {
        label: t('components.app_header.menu_items.dashboard'),
        icon: 'i-lucide-chart-bar',
        to: '/dashboard',
    },
    {
        label: t('components.app_header.menu_items.trades'),
        icon: 'i-heroicons-chart-bar',
        to: '/main',
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

function toggleColorMode() {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

function toggleLanguage() {
    const newLocale = locale.value === 'fr' ? 'en' : ('fr' as const)
    setLocale(newLocale)
    localStorage.setItem('i18n-locale', newLocale)
}

const onLogActivity = () => {
    mobileMenuOpen.value = false
    if (myLogView.value) {
        const logView = myLogView.value as ILogView

        if (logView.isOpen()) logView.onClose()
        else logView.onOpen()
    }
}

watch(
    () => userStore.logDebug1,
    () => {
        log_debug('logDebug1 changed')
    }
)

watch(
    () => userStore.logDebug2,
    () => {
        log_error('logDebug2 changed')
    }
)
</script>
