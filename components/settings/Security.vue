<template>
	<SettingsSection
		:title="$t('components.settings.security.title')"
	>
		<template #alert>
			<CommonAlertBox :success-str="successStr" :error-str="errorStr" />
		</template>

		<p class="text-secondary mb-6">{{ $t('components.settings.security.description') }}</p>

		<div class="space-y-4 max-w-md">
			<UFormField name="currentEmail" :label="$t('components.settings.security.current_email')">
				<UInput
					:model-value="userStore.user?.email || ''"
					readonly
					class="w-full"
				/>
			</UFormField>

			<div class="flex gap-2">
				<UButton
					icon="i-heroicons-envelope"
					size="sm"
					variant="outline"
					@click="openModal('email')"
				>
					{{ $t('components.settings.security.change_email') }}
				</UButton>
				<UButton
					icon="i-heroicons-key"
					size="sm"
					variant="outline"
					@click="openModal('password')"
				>
					{{ $t('components.settings.security.change_password') }}
				</UButton>
			</div>
		</div>

		<CommonModalDefault
			v-model:open="modalOpen"
			:title="modalMode === 'email'
				? $t('components.settings.security.change_email')
				: $t('components.settings.security.change_password')"
		>
			<template #content>
				<CommonAlertBox :success-str="modalSuccessStr" :error-str="modalErrorStr" />

				<UForm
					v-if="modalMode === 'email'"
					id="securityEmailForm"
					:state="emailState"
					:schema="ChangeEmailSchema"
					:validate-on="['change', 'input']"
					@submit="onSubmitEmail"
					@error="onError"
				>
					<div class="form-fields-container">
						<UFormField name="email" :label="$t('components.settings.security.new_email')" required>
							<UInput
								v-model="emailState.email"
								type="email"
								autocomplete="off"
								autofocus
								:placeholder="userStore.user?.email || ''"
								class="w-full"
							/>
						</UFormField>
						<UFormField name="currentPassword" :label="$t('components.settings.security.current_password')" required>
							<UInput
								v-model="emailState.currentPassword"
								type="password"
								autocomplete="off"
								class="w-full"
							/>
						</UFormField>
					</div>
				</UForm>

				<UForm
					v-else
					id="securityPasswordForm"
					:state="passwordState"
					:schema="ChangePasswordSchema"
					:validate-on="['change', 'input']"
					@submit="onSubmitPassword"
					@error="onError"
				>
					<div class="form-fields-container">
						<UFormField name="currentPassword" :label="$t('components.settings.security.current_password')" required>
							<UInput
								v-model="passwordState.currentPassword"
								type="password"
								autocomplete="off"
								autofocus
								class="w-full"
							/>
						</UFormField>
						<UFormField name="newPassword" :label="$t('components.settings.security.new_password')" required>
							<UInput
								v-model="passwordState.newPassword"
								type="password"
								autocomplete="off"
								class="w-full"
							/>
						</UFormField>
						<UFormField name="confirmPassword" :label="$t('components.settings.security.confirm_password')" required>
							<UInput
								v-model="passwordState.confirmPassword"
								type="password"
								autocomplete="off"
								class="w-full"
							/>
						</UFormField>
					</div>
				</UForm>
			</template>
			<template #footer>
				<div class="action-buttons-end">
					<UButton
						type="submit"
						:form="modalMode === 'email' ? 'securityEmailForm' : 'securityPasswordForm'"
						:loading="saving"
					>
						{{ $t('common.actions.save') }}
					</UButton>
					<UButton type="button" variant="soft" @click.prevent="modalOpen = false">
						{{ $t('common.actions.cancel') }}
					</UButton>
				</div>
			</template>
		</CommonModalDefault>
	</SettingsSection>
</template>

<script setup lang="ts">
import { ChangeEmailSchema, ChangePasswordSchema, type ChangeEmailType, type ChangePasswordType } from '~/schema/user'

const { t } = useI18n()
const userStore = useUserStore()
const { success: toastSuccess, error: toastError } = useAppToast()

type ModalMode = 'email' | 'password'

const modalOpen = ref(false)
const modalMode = ref<ModalMode>('password')
const saving = ref(false)

const successStr = ref<string | null>(null)
const errorStr = ref<string | null>(null)
const modalSuccessStr = ref<string | null>(null)
const modalErrorStr = ref<string | null>(null)

const emailState = ref<ChangeEmailType>({
	currentPassword: '',
	email: '',
})

const passwordState = ref<ChangePasswordType>({
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
})

const resetAlerts = () => {
	successStr.value = null
	errorStr.value = null
	modalSuccessStr.value = null
	modalErrorStr.value = null
}

const clearAlertsAfter = (ms: number) => {
	setTimeout(() => resetAlerts(), ms)
}

const onError = (event: FormErrorEvent) => {
	const errors = Object.values(event.errors).flat() as Array<{ message?: string } | string>
	const firstError = errors.length > 0 ? errors[0] : null
	const errorMessage = firstError
		? (typeof firstError === 'string' ? firstError : firstError.message)
		: t('components.settings.security.update_error')
	modalErrorStr.value = errorMessage ?? t('components.settings.security.update_error')
	modalSuccessStr.value = null
	clearAlertsAfter(5000)
}

const openModal = (mode: ModalMode) => {
	modalMode.value = mode
	emailState.value = { currentPassword: '', email: userStore.user?.email || '' }
	passwordState.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
	resetAlerts()
	modalOpen.value = true
}

const mapServerError = (error: unknown): string => {
	const err = error as { data?: { tag?: string } }
	const tag = err?.data?.tag
	if (tag === 'api.auth.security.wrong_password') return t('components.settings.security.wrong_password')
	if (tag === 'api.auth.security.email_exists') return t('components.settings.security.email_exists')
	if (tag === 'api.auth.security.password_too_short') return t('components.settings.security.password_too_short')
	if (tag === 'api.auth.security.invalid_email') return t('components.settings.security.invalid_email')
	return t('components.settings.security.update_error')
}

const onSubmitEmail = async () => {
	saving.value = true
	resetAlerts()
	try {
		await $fetch('/api/auth/security', {
			method: 'PATCH',
			body: {
				currentPassword: emailState.value.currentPassword,
				email: emailState.value.email,
			},
		})

		if (userStore.user) {
			userStore.user.email = emailState.value.email
		}

		toastSuccess(t('components.settings.security.update_success'))
		modalSuccessStr.value = t('components.settings.security.update_success')
		clearAlertsAfter(5000)
		modalOpen.value = false
	} catch (error) {
		const message = mapServerError(error)
		toastError(t('components.settings.security.update_error'), message)
		modalErrorStr.value = message
		clearAlertsAfter(5000)
	} finally {
		saving.value = false
	}
}

const onSubmitPassword = async () => {
	saving.value = true
	resetAlerts()
	try {
		await $fetch('/api/auth/security', {
			method: 'PATCH',
			body: {
				currentPassword: passwordState.value.currentPassword,
				newPassword: passwordState.value.newPassword,
			},
		})

		toastSuccess(t('components.settings.security.update_success'))
		modalSuccessStr.value = t('components.settings.security.update_success')
		clearAlertsAfter(5000)
		modalOpen.value = false
	} catch (error) {
		const message = mapServerError(error)
		toastError(t('components.settings.security.update_error'), message)
		modalErrorStr.value = message
		clearAlertsAfter(5000)
	} finally {
		saving.value = false
	}
}
</script>
