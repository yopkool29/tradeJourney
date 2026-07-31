<template>
    <div class="min-h-full flex items-center justify-center px-4 py-16">
        <div class="w-full max-w-md">
            <UCard class="bg-gray-100 dark:bg-gray-800">
                <template #header>
                    <div class="flex flex-col">
                        <h1 class="text-2xl font-bold mb-2 text-primary">{{ $t('components.already_logged_in.title') }}</h1>
                        <p class="text-secondary">{{ $t('components.already_logged_in.alert.description') }}</p>
                    </div>
                </template>

                <div class="space-y-6">
                    <UAlert
                        color="warning"
                        icon="i-heroicons-shield-check"
                        :title="$t('components.already_logged_in.alert.title')"
                    />

                    <div class="flex flex-col gap-3">
                        <UButton
                            block
                            color="primary"
                            size="lg"
                            icon="i-heroicons-arrow-right-circle"
                            @click="onContinue"
                        >
                            {{ $t('components.already_logged_in.buttons.continue') }}
                        </UButton>
                        <UButton
                            block
                            color="neutral"
                            variant="soft"
                            size="lg"
                            :loading="isLoading"
                            icon="i-heroicons-arrow-left-on-rectangle"
                            @click="onLogout"
                        >
                            {{ $t('components.already_logged_in.buttons.logout') }}
                        </UButton>
                    </div>
                </div>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
const isLoading = ref(false)
const router = useRouter()
const user = useUserStore()
const { t } = useI18n()
const { logout } = useAuth()
const { log_error } = useLogView()
const hideHeader = useState<boolean>('hideHeader', () => false)

hideHeader.value = true
onUnmounted(() => { hideHeader.value = false })

const onContinue = () => {
    const route = useRoute()
    const { currentDatabase } = useDatabase()
    hideHeader.value = false
    
    // If no database selected, go to select-database first
    if (!currentDatabase.value) {
        router.push('/select-database')
        return
    }
    
    // If we have a redirect query param, use it
    const redirectTo = route.query.redirect as string
    if (redirectTo) {
        router.push(redirectTo)
    } else {
        // Default to main page
        router.push('/main')
    }
    
    user.triggerDataRefresh()
}

const onLogout = async () => {
    isLoading.value = true
    hideHeader.value = false
    try {
        await logout()
        router.push('/login')
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        log_error(message)
    } finally {
        isLoading.value = false
    }
}
</script>
