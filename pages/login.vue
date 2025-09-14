<template>
    <div class="min-h-screen flex justify-center px-4 pt-20 bg-gray-50 dark:bg-gray-900">
        <div class="w-full max-w-md">
            <UCard v-if="!userStore.user" class="shadow-lg dark:shadow-gray-800/30">
                <template #header>
                    <div class="flex flex-col">
                        <h1 class="text-3xl font-bold mb-2 text-primary-600 dark:text-primary-400">{{ $t('pages.login.title') }}</h1>
                        <p class="text-gray-600 dark:text-gray-400">{{ $t('pages.login.subtitle') }}</p>
                    </div>
                </template>

                <h2 class="text-2xl font-bold text-left mb-6">{{ $t('pages.login.heading') }}</h2>

                <UForm :state="newState" :schema="UserSchema" class="space-y-6" @submit="onSubmit">
                    <UFormField :label="$t('pages.login.email.label')" name="email" :description="$t('pages.login.email.description')" required>
                        <UInput
                            v-model="newState.email"
                            type="email"
                            class="w-full"
                            placeholder="example@domain.com"
                            icon="i-heroicons-envelope"
                            autofocus
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

                    <UButton type="submit" size="lg" color="primary" :loading="isLoading">{{ $t('pages.login.submit_button') }}</UButton>
                </UForm>

                <UAlert
                    v-if="errorStr"
                    :title="$t('pages.login.error_title')"
                    icon="i-heroicons-exclamation-circle"
                    color="error"
                    class="mt-6"
                    :description="errorStr || ''"
                />
            </UCard>
            <AlreadyLoggedIn v-if="userStore.user && auth_display" />
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

const isLoading = ref(false)
const auth_display = ref(true)
const errorStr = ref<string | null>(null)

// Utilisation des tokens de traduction pour les messages de validation
const UserSchema = z.object({
    email: z.string().email({ message: t('pages.login.validation.invalid_email') }),
    password: z.string().min(4, { message: t('pages.login.validation.password_min_length') }),
})

type UserType = z.infer<typeof UserSchema>

const getDefault = () => ({ email: '', password: '' })

const newState = ref<UserType>(getDefault())

onMounted(() => {
    userStore.isLoading = false
})

async function onSubmit(event: FormSubmitEvent<UserType>) {
    isLoading.value = true
    auth_display.value = false

    try {
        await login({ email: event.data.email, password: event.data.password })
        userStore.setInvalidate()
        router.push('/dashboard')
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        errorStr.value = message
    } finally {
        isLoading.value = false
    }
}
</script>
