<template>
    <SettingsSection
        :title="$t('components.settings.accounts.title')"
        :show-refresh="true"
        :loading="isLoading"
        @refresh="fetchAccounts"
    >
        <template #actions>
            <CommonModalDefault v-model:open="showAddAccount"
                :title="editingAccountId ? $t('components.settings.accounts.edit_account') : $t('components.settings.accounts.add_account_modal')">
                <template #trigger>
                    <UButton icon="i-lucide-plus" size="xs" @click="newAccount()">{{
                        $t('components.settings.accounts.add_account') }}</UButton>
                </template>
                <template #content>
                    <UForm id="createAccountForm1" :state="newAccountState" :validate-on="['change', 'input']"
                        :schema="CreateAccountSchema" @submit="onSubmitAccount" @error="onError">
                        <div class="form-fields-container">
                            <UFormField name="name" :label="$t('components.settings.accounts.name_label')" required>
                                <div class="flex items-center gap-2">
                                    <UInput v-model="newAccountState.name"
                                        :placeholder="$t('components.settings.accounts.name_placeholder')" disabled
                                        autofocus class="flex-1" />
                                    <UButton icon="i-lucide-copy" size="xs" variant="ghost" color="neutral"
                                        @click="copyAccountName" />
                                </div>
                            </UFormField>
                            <UFormField name="displayName"
                                :label="$t('components.settings.accounts.display_name_label')">
                                <UInput v-model="newAccountState.displayName" autofocus class="md:w-2/3"
                                    :placeholder="$t('components.settings.accounts.display_name_placeholder')" />
                            </UFormField>
                            <UFormField name="fullname" :label="$t('components.settings.accounts.fullname_label')">
                                <UInput v-model="newAccountState.fullname" class="md:w-2/3"
                                    :placeholder="$t('components.settings.accounts.fullname_placeholder')" />
                            </UFormField>
                            <UFormField name="startingCapital" :label="$t('components.settings.accounts.starting_capital_label')">
                                <UInputNumber v-model="startingCapital" class="md:w-2/3" :min="100" :max="5000000" :step="100"
                                    :placeholder="$t('components.settings.accounts.starting_capital_placeholder')" />
                            </UFormField>
                            <UFormField name="customFields" :label="$t('components.common.customFields.label')">
                                <CommonCustomFields
                                    v-model="customFields"
                                    first-field-key="aliases"
                                />
                            </UFormField>
                        </div>
                    </UForm>
                </template>
                <template #footer>
                    <div class="action-buttons-end">
                        <UButton type="submit" form="createAccountForm1"
                            :disabled="!newAccountState.name && editingAccountId != null">{{
                                $t('common.actions.save')
                            }}</UButton>
                        <UButton type="button" variant="soft" @click.prevent="showAddAccount = false">{{
                            $t('common.actions.cancel') }}</UButton>
                    </div>
                </template>
            </CommonModalDefault>
        </template>

        <template #alert>
            <CommonAlertBox :success-str="successStr" :error-str="errorStr" />
        </template>

        <p class="text-secondary mb-6">{{ $t('components.settings.accounts.description') }}</p>

            <!-- Filtres avancés -->
            <CommonAdvancedFilters v-model="filters" :columns="filterableColumnsConfig" :loading="filterLoading"
                @add="addFilter" @remove="removeFilter" @apply="onApplyFilters" @reset="resetFilters" />

        <!-- Liste des comptes -->
        <div class="mt-6">
            <h3 class="section-subtitle">{{ $t('components.settings.accounts.accounts_list') }}</h3>
            <UTable :data="filteredAccounts" :columns="columns" class="mb-2">
                    <template #aliases-cell="{ row }">
                        <span class="text-secondary">{{ getAccountAliasDisplay(row.original) || '—' }}</span>
                    </template>
                    <template #startingCapital-cell="{ row }">
                        <span v-if="getStartingCapital(row.original)">
                            {{ formatCurrency(getStartingCapital(row.original)) }}
                        </span>
                        <span v-else class="text-muted">-</span>
                    </template>
                    <template #actions-cell="{ row }">
                        <div class="flex gap-2 items-center">
                            <UButton icon="i-heroicons-pencil-square" size="xs" color="primary" variant="ghost"
                                @click="editAccount(row.original)">
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
    </SettingsSection>
</template>

<script setup lang="ts">
import { useAccountsManager } from '~/composables/settings/useAccountsManager'

const { formatCurrency } = useUtils()

const {
	CreateAccountSchema,
	accounts: _accounts, isLoading, fetchAccounts,
	filters, filterLoading, filterableColumnsConfig,
	addFilter, removeFilter, resetFilters, onApplyFilters,
	filteredAccounts,
	showAddAccount, newAccountState, editingAccountId, startingCapital, customFields,
	customFieldsHasErrors: _customFieldsHasErrors, columns,
	errorStr, successStr,
	onError, copyAccountName, getStartingCapital, getAccountAliasDisplay,
	newAccount, editAccount, onSubmitAccount,
	onDeleteAccount, onDeleteAccountTrades, onDeleteAccountDesactivatedTrades,
} = useAccountsManager()

onMounted(async () => {
	await fetchAccounts()
})
</script>
