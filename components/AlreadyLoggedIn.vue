<template>
    <div class="flex items-start justify-center pt-16 min-h-[70vh] bg-gray-50 dark:bg-gray-900 p-4">
        <UCard class="max-w-md w-full shadow-xl transition-all duration-300 hover:shadow-2xl border-l-4 border-l-warning-500">
            <template #header>
                <div class="flex flex-col items-center justify-center py-4 bg-warning-50 dark:bg-warning-900/20 rounded-t-lg">
                    <UIcon name="i-heroicons-shield-check" class="text-warning-500 text-5xl mb-2 animate-pulse" />
                    <h2 class="font-bold text-warning-800 dark:text-warning-200 text-2xl">{{ $t('components.already_logged_in.title') }}</h2>
                </div>
            </template>

            <div class="p-6">
                <UAlert
                    color="warning"
                    icon="i-heroicons-information-circle"
                    :title="$t('components.already_logged_in.alert.title')"
                    class="mb-8"
                    :description="$t('components.already_logged_in.alert.description')"
                />

                <div class="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                    <UButton
                        block
                        color="warning"
                        variant="solid"
                        icon="i-heroicons-arrow-right-circle"
                        class="order-1 sm:order-none"
                        @click="onContinue"
                    >
                        {{ $t('components.already_logged_in.buttons.continue') }}
                    </UButton>
                    <UButton
                        block
                        color="neutral"
                        variant="outline"
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
</template>

<script setup lang="ts">
const isLoading = ref(false)
const router = useRouter()
const user = useUserStore()
const { t } = useI18n()
const { logout } = useAuth()
const { log_error } = useLogView()

function onContinue() {
    router.push('/main')
    user.setInvalidate()
}

async function onLogout() {
    isLoading.value = true
    try {
        await logout()
        router.push('/login')
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        log_error(message)
    } finally {
        isLoading.value = false
    }
}
</script>
