<template>
    <div class="min-h-full flex items-center justify-center px-4 py-30 select-none">
        <div class="w-full max-w-md">
            <UCard v-if="!userStore.user">
                <template #header>
                    <div class="flex items-start justify-between">
                        <div class="flex flex-col">
                            <AppLogo :width="180" class="mb-2" />
                            <p class="text-secondary">{{ $t('pages.login.subtitle') }}</p>
                        </div>
                        <UButton
                            :color="resetOnLogin ? 'error' : 'neutral'"
                            :variant="resetOnLogin ? 'soft' : 'ghost'"
                            size="sm"
                            icon="i-heroicons-adjustments-horizontal"
                            :title="$t('pages.login.reset_local_data')"
                            @click="resetOnLogin = !resetOnLogin"
                        />
                    </div>
                </template>

                <h2 class="text-2xl font-bold text-left mb-6">{{ $t('pages.login.heading') }}</h2>

                <UForm id="loginForm" :state="newState" :schema="UserSchema" :validate-on="['submit']" class="space-y-6" @submit="onSubmit">
                    <UFormField :label="$t('pages.login.email.label')" name="email" :description="$t('pages.login.email.description')" required>
                        <UInput
                            v-model="newState.email"
                            type="email"
                            class="w-full"
                            placeholder="example@domain.com"
                            icon="i-heroicons-envelope"
                            autocomplete="email"
                        />
                    </UFormField>

                    <UFormField :label="$t('pages.login.password.label')" name="password" required>
                        <UInput
                            v-model="newState.password"
                            type="password"
                            class="w-full"
                            :placeholder="$t('pages.login.password.placeholder')"
                            icon="i-heroicons-lock-closed"
                            autocomplete="current-password"
                        />
                    </UFormField>
                </UForm>

                <UButton type="submit" form="loginForm" size="lg" :loading="isLoading" block
                    class="mt-6 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-400 hover:to-primary-600 text-white border-0">
                    {{ $t('pages.login.submit_button') }}
                </UButton>

                <div class="mt-6">
                    <CommonAlertBox :success-str="successStr" :error-str="errorStr" />
                </div>

            </UCard>
            <AlreadyLoggedIn v-if="mounted && userStore.user && auth_display" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()

const router = useRouter()
const { login } = useAuth()
const userStore = useUserStore()
const { errorStr, successStr, displayMessage } = useAlert()

const mounted = ref(false)

const isLoading = ref(false)
const auth_display = ref(true)
const resetOnLogin = ref(false)

// Utilisation des tokens de traduction pour les messages de validation
const UserSchema = z.object({
    email: z.string().email({ message: t('pages.login.validation.invalid_email') }),
    password: z.string().min(4, { message: t('pages.login.validation.password_min_length') }),
})

type UserType = z.infer<typeof UserSchema>

const getDefault = () => ({ email: '', password: '' })

const newState = ref<UserType>(getDefault())

onMounted(() => {
    const { stopLoading } = useGlobalLoading()
    stopLoading()
    // Pré-remplir l'email depuis localStorage
    if (import.meta.client) {
        const savedEmail = localStorage.getItem('pnltracker_login_email')
        if (savedEmail) newState.value.email = savedEmail
    }
    mounted.value = true
})

async function onSubmit(event: FormSubmitEvent<UserType>) {
    isLoading.value = true
    displayMessage(null, null)

    try {
        // Hide AlreadyLoggedIn component before redirect
        auth_display.value = false

        await login({ email: event.data.email, password: event.data.password })

        // Sauvegarder l'email pour pré-remplir au prochain login
        if (import.meta.client) {
            localStorage.setItem('pnltracker_login_email', event.data.email)
        }

        if (resetOnLogin.value) {
            const dbStateStore = useDbStateStore()
            dbStateStore.resetAllLocalState()
            if (import.meta.client) {
                localStorage.removeItem('dbStateStore')
            }
            const { saveUiState } = useUiStateSync()
            await saveUiState()
        }

        // Redirect to intended page or database selection
        // const redirectTo = route.query.redirect as string
        // router.push(redirectTo || '/select-database')
        router.push('/select-database')
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
        isLoading.value = false
        auth_display.value = true
    }
}
</script>
