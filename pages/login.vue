<template>
    <div class="min-h-full flex items-center justify-center px-4 py-30 select-none">
        <div class="w-full max-w-md">
            <UCard v-if="!userStore.user" class="bg-gray-100 dark:bg-gray-800">
                <template #header>
                    <div class="flex flex-col">
                        <h1 class="text-3xl font-bold mb-2 text-primary">{{ $t('pages.login.title') }}</h1>
                        <p class="text-secondary">{{ $t('pages.login.subtitle') }}</p>
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
                        />
                    </UFormField>

                    <UFormField :label="$t('pages.login.password.label')" name="password" required>
                        <UInput
                            v-model="newState.password"
                            type="password"
                            class="w-full"
                            :placeholder="$t('pages.login.password.placeholder')"
                            icon="i-heroicons-lock-closed"
                        />
                    </UFormField>
                </UForm>

                <UButton type="submit" form="loginForm" size="lg" color="primary" :loading="isLoading" block class="mt-6">{{ $t('pages.login.submit_button') }}</UButton>

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
    mounted.value = true
})

async function onSubmit(event: FormSubmitEvent<UserType>) {
    isLoading.value = true
    displayMessage(null, null)

    try {
        // Hide AlreadyLoggedIn component before redirect
        auth_display.value = false

        await login({ email: event.data.email, password: event.data.password })
        
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
