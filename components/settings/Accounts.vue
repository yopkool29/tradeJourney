<template>
    <UCard class="card-container-2xl">
        <template #header>
            <div class="header-layout">
                <span class="section-title">{{ $t('components.settings.accounts.title') }}</span>
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
                            <div class="form-fields-container">
                                <UFormField name="name" :label="$t('components.settings.accounts.name_label')" required>
                                    <div class="flex items-center gap-2">
                                        <UInput
                                            v-model="newAccountState.name"
                                            :placeholder="$t('components.settings.accounts.name_placeholder')"
                                            disabled
                                            autofocus
                                            class="flex-1"
                                        />
                                        <UButton
                                            icon="i-lucide-copy"
                                            size="xs"
                                            variant="ghost"
                                            color="neutral"
                                            @click="copyAccountName"
                                        />
                                    </div>
                                </UFormField>
                                <UFormField name="displayName" :label="$t('components.settings.accounts.display_name_label')">
                                    <UInput class="md:w-2/3"
                                        autofocus
                                        v-model="newAccountState.displayName"
                                        :placeholder="$t('components.settings.accounts.display_name_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="fullname" :label="$t('components.settings.accounts.fullname_label')">
                                    <UInput class="md:w-2/3" 
                                        v-model="newAccountState.fullname"
                                        :placeholder="$t('components.settings.accounts.fullname_placeholder')"
                                    />
                                </UFormField>
                                <UFormField name="aliases" :label="$t('components.settings.accounts.aliases_label')">
                                    <UInput class="md:w-2/3"
                                        v-model="newAccountState.aliases"
                                        :placeholder="$t('components.settings.accounts.aliases_placeholder')"
                                    />
                                </UFormField>
                            </div>
                        </UForm>
                    </template>
                    <template #footer>
                        <div class="action-buttons-end">
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
            <p class="text-secondary mb-6">{{ $t('components.settings.accounts.description') }}</p>

            <UAlert v-if="successStr" variant="outline" color="success" class="mb-4" :description="successStr || ''" />
            <UAlert v-if="errorStr" variant="outline" color="error" class="mb-4" :description="errorStr || ''" />

            <!-- Filtres avancés -->
            <CommonAdvancedFilters
                v-model="filters"
                :columns="filterableColumnsConfig"
                :loading="filterLoading"
                @add="addFilter"
                @remove="removeFilter"
                @apply="onApplyFilters"
                @reset="resetFilters"
            />

            <!-- Liste des comptes -->
            <div class="mt-6">
                <h3 class="section-subtitle">{{ $t('components.settings.accounts.accounts_list') }}</h3>
                <UTable :data="filteredAccounts" :columns="columns" class="mb-2">
                    <template #actions-cell="{ row }">
                        <div class="action-buttons">
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
import type { TradeFilter, FilterColumn } from '~/type'

const { t } = useI18n()
const userStore = useUserStore()
const { log_error } = useLogView()
const { accounts, fetchAccounts, createAccount, updateAccount, deleteAccount } = useAccount()
const { deleteAccountTrades } = useTrades()

onMounted(async () => {
    await fetchAccounts()
})

// Filtres avancés
const filters = ref<TradeFilter[]>([{ column: 'displayName', operator: '=', value: '' }])
const filterLoading = ref(false)

const filterableColumnsConfig = computed<FilterColumn[]>(() => [
    {
        label: t('components.settings.accounts.column_display_name'),
        value: 'displayName',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
    {
        label: t('components.settings.accounts.column_fullname'),
        value: 'fullname',
        dataType: 'text',
        operators: ['=', '!='],
        defaultOperator: '=',
    },
])

const addFilter = () => {
    if (filters.value.length < 2) {
        filters.value.push({ column: 'displayName', operator: '=', value: '' })
    }
}

const removeFilter = (index: number) => {
    filters.value.splice(index, 1)
}

const resetFilters = () => {
    filters.value = [{ column: 'displayName', operator: '=', value: '' }]
    applyFilters()
}

const applyFilters = () => {
    // Les filtres sont appliqués via computed filteredAccounts
}

const onApplyFilters = () => {
    filterLoading.value = true
    setTimeout(() => {
        applyFilters()
        filterLoading.value = false
    }, 100)
}

// Filtrage des comptes
const filteredAccounts = computed(() => {
    return accounts.value.filter((account) => {
        return filters.value.every((filter) => {
            if (!filter.value && filter.value !== false) return true

            const accountValue = account[filter.column as keyof typeof account]
            const filterValue = filter.value

            switch (filter.operator) {
                case '=':
                    return String(accountValue || '').toLowerCase().includes(String(filterValue).toLowerCase())
                case '!=':
                    return !String(accountValue || '').toLowerCase().includes(String(filterValue).toLowerCase())
                default:
                    return true
            }
        })
    })
})

const errorStr = ref<string | null>(null)
const successStr = ref<string | null>(null)

const displayMessage = (success: string | null, error: string | null) => {
    successStr.value = success || null
    errorStr.value = error || null
    if (error) log_error(error)
}

const getDefaultCreateAccount = () => ({ 
    name: '', 
    fullname: '', 
    displayName: '', 
    aliases: '',
})

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
    { id: 'aliases', accessorKey: 'aliases', header: t('components.settings.accounts.column_aliases') }

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

function copyAccountName() {
    if (newAccountState.value.name) {
        navigator.clipboard.writeText(newAccountState.value.name)
    }
}

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
        const { message } = catchTagMessage(err, t)
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
        userStore.triggerDataRefresh()
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteAccountTrades(id: number) {
    try {
        const result = await deleteAccountTrades(id)
        await fetchAccounts()
        displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
        userStore.triggerDataRefresh()
        // log_info(result.message);
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}

async function onDeleteAccountDesactivatedTrades(id: number) {
    try {
        const result = await deleteAccountTrades(id, true)
        await fetchAccounts()
        displayMessage(t('components.settings.accounts.delete_trades_success', { count: result.count }), null)
        userStore.triggerDataRefresh()
        // log_info(result.message);
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
        log_error(message)
    }
}
</script>
