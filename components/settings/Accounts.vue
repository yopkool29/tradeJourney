<template>
    <UCard class="mb-8 md:max-w-6xl min-w-md">
        <template #header>
            <div class="flex flex-col justify-between items-start gap-4">
                <span class="font-bold text-lg">{{ $t('components.settings.accounts.title') }}</span>
                <CommonModalDefault
                    v-model:open="showAddAccount"
                    :title="editingAccountId ? $t('components.settings.accounts.edit_account') : $t('components.settings.accounts.add_account_modal')"
                >
                    <template #trigger>
                        <UButton icon="i-lucide-plus" size="xs" @click="newAccount()">{{ $t('components.settings.accounts.add_account') }}</UButton>
                    </template>
                    <template #content>
                        <UForm
                            id="createAccountForm1"
                            :state="newAccountState"
                            :validate-on="['change', 'input']"
                            :schema="CreateAccountSchema"
                            @submit="onSubmitAccount"
                            @error="onError"
                        >
                            <div class="flex flex-col gap-4">
                                <UFormField name="name" :label="$t('components.settings.accounts.name_label')" required>
                                    <UInput
                                        v-model="newAccountState.name"
                                        :placeholder="$t('components.settings.accounts.name_placeholder')"
                                        disabled
                                        autofocus
                                    />
                                </UFormField>
                                <UFormField name="displayName" :label="$t('components.settings.accounts.display_name_label')">
                                    <UInput
                                        v-model="newAccountState.displayName"
                                        :placeholder="$t('components.settings.accounts.display_name_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="fullname" :label="$t('components.settings.accounts.fullname_label')">
                                    <UInput
                                        v-model="newAccountState.fullname"
                                        :placeholder="$t('components.settings.accounts.fullname_placeholder')"
                                    />
                                </UFormField>
                            </div>
                        </UForm>
                    </template>
                    <template #footer>
                        <div class="flex gap-2 justify-end">
                            <UButton type="submit" form="createAccountForm1" :disabled="!newAccountState.name && editingAccountId != null">{{
                                $t('common.actions.save')
                            }}</UButton>
                            <UButton type="button" variant="soft" @click.prevent="showAddAccount = false">{{ $t('common.actions.cancel') }}</UButton>
                        </div>
                    </template>
                </CommonModalDefault>
            </div>
        </template>
        <div class="p-4">
            <p class="text-gray-600 dark:text-gray-400 mb-6">{{ $t('components.settings.accounts.description') }}</p>

            <UAlert v-if="successStr" variant="outline" color="success" class="mb-4" :description="successStr || ''" />
            <UAlert v-if="errorStr" variant="outline" color="error" class="mb-4" :description="errorStr || ''" />

            <!-- Liste des comptes -->
            <div>
                <h3 class="text-lg font-medium mb-3">{{ $t('components.settings.accounts.accounts_list') }}</h3>
                <UTable :data="accounts" :columns="columns" class="mb-2">
                    <template #actions-cell="{ row }">
                        <div class="flex gap-2">
                            <UButton icon="i-heroicons-pencil-square" size="xs" color="primary" variant="ghost" @click="editAccount(row.original)">
                                {{ $t('components.settings.accounts.edit_account') }}
                            </UButton>
                            <CommonModalDelete @confirm="onDeleteAccount(row.original.id)">
                                <template #trigger>
                                    <UButton icon="i-heroicons-trash" size="xs" color="error" variant="solid">
                                        {{ $t('components.settings.accounts.delete_account') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    {{ $t('components.settings.accounts.confirm_delete_account') }}
                                </template>
                            </CommonModalDelete>
                            <CommonModalDelete @confirm="onDeleteAccountTrades(row.original.id)">
                                <template #trigger>
                                    <UButton size="xs" color="warning" variant="solid">
                                        {{ $t('components.settings.accounts.delete_trades') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    {{ $t('components.settings.accounts.confirm_delete_trades') }}
                                </template>
                            </CommonModalDelete>
                            <CommonModalDelete @confirm="onDeleteAccountDesactivatedTrades(row.original.id)">
                                <template #trigger>
                                    <UButton size="xs" color="yellow" variant="ghost">
                                        {{ $t('components.settings.accounts.delete_inactive_trades') }}
                                    </UButton>
                                </template>
                                <template #content>
                                    {{ $t('components.settings.accounts.confirm_delete_inactive_trades') }}
                                </template>
                            </CommonModalDelete>
                        </div>
                    </template>
                </UTable>
            </div>
        </div>
    </UCard>
</template>

<script setup lang="ts">
import { CreateAccountSchema, type AccountType, type CreateAccountType, type UpdateAccountType } from '~/schema/account'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'

const { t } = useI18n()

const { log_error } = useLogView()
const { accounts, fetchAccounts, createAccount, updateAccount, deleteAccount } = useAccount()
const { deleteAccountTrades } = useTrades()
const userStore = useUserStore()

const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)

const displayMessage = (success: string | null, error: string | null) => {
    successStr.value = success || null
    errorStr.value = error || null
    if (error) log_error(error)
}

const getDefaultCreateAccount = () => ({ name: '', fullname: '', displayName: '' })

const showAddAccount = ref(false)
const newAccountState = ref<CreateAccountType>(getDefaultCreateAccount())
const editingAccountId = ref<number | null>(null)

// Synchroniser displayName avec name quand on n'est pas en mode édition
watch(
    () => newAccountState.value.displayName,
    (newVal) => {
        if (!editingAccountId.value && newVal) {
            newAccountState.value.name = newVal
        }
    }
)

const columns = computed(() => [
    { id: 'actions', accessorKey: 'actions', header: t('components.settings.accounts.column_actions') },
    { id: 'id', accessorKey: 'id', header: t('components.settings.accounts.column_id') },
    // { id: 'name', accessorKey: 'name', header: t('components.settings.accounts.column_name') },
    { id: 'displayName', accessorKey: 'displayName', header: t('components.settings.accounts.column_display_name') },
    { id: 'fullname', accessorKey: 'fullname', header: t('components.settings.accounts.column_fullname') },
])

function onError(_event: FormErrorEvent) {
    const errorMessages = Object.values(_event.errors).flat()
    const errorMessage = errorMessages.length > 0 ? errorMessages[0] : t('components.settings.accounts.error_occurred')
    log_error(errorMessage)
    errorStr.value = errorMessage as string
    successStr.value = null
    setTimeout(() => {
        errorStr.value = null
        successStr.value = null
    }, 5000)
}

onMounted(fetchAccounts)

function newAccount() {
    displayMessage(null, null)
    editingAccountId.value = null
    newAccountState.value = getDefaultCreateAccount()
    showAddAccount.value = true
}

function editAccount(account: AccountType) {
    displayMessage(null, null)
    editingAccountId.value = account.id
    newAccountState.value = { ...account }
    showAddAccount.value = true
}

// utilise displayMessage a la place de mettre directement errorStr.value ou successStr.value

async function onSubmitAccount(event: FormSubmitEvent<CreateAccountType | UpdateAccountType>) {
    try {
        if (editingAccountId.value) {
            // Update
            await updateAccount(event.data as UpdateAccountType)
            displayMessage(t('components.settings.accounts.account_updated'), null)
        } else {
            // Create
            await createAccount(event.data as CreateAccountType)
            displayMessage(t('components.settings.accounts.account_created'), null)
        }
        await fetchAccounts()
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    } finally {
        showAddAccount.value = false
    }
}

async function onDeleteAccount(id: number) {
    try {
        await deleteAccount(id)
        await fetchAccounts()
        displayMessage(t('components.settings.accounts.account_deleted'), null)
        userStore.setInvalidate()
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteAccountTrades(id: number) {
    try {
        const result = await deleteAccountTrades(id)
        await fetchAccounts()
        displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
        userStore.setInvalidate()
        // log_info(result.message);
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteAccountDesactivatedTrades(id: number) {
    try {
        const result = await deleteAccountTrades(id, true)
        await fetchAccounts()
        displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
        userStore.setInvalidate()
        // log_info(result.message);
    } catch (err) {
        const { tag, message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}
</script>
