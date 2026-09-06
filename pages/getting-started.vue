<template>
    <div class="container mx-auto px-4 py-8">
        <div class="flex flex-col items-center justify-center text-center py-16 px-4 max-w-xl mx-auto">
            <UIcon name="i-lucide-database" class="w-16 h-16 text-muted mb-4" />
            <h2 class="text-xl font-semibold text-default mb-2">
                {{ $t('pages.getting_started.title') }}
            </h2>
            <p class="text-muted mb-4">
                {{ $t('pages.getting_started.message') }}
            </p>
            <ul class="text-muted text-left mb-8 list-disc list-inside space-y-1">
                <li><strong class="text-default">{{ $t('pages.getting_started.option_import_label') }}</strong> {{ $t('pages.getting_started.option_import_detail') }}</li>
                <li><strong class="text-default">{{ $t('pages.getting_started.option_manual_label') }}</strong> {{ $t('pages.getting_started.option_manual_detail') }}</li>
            </ul>
            <div class="flex flex-col sm:flex-row gap-3">
                <UButton
                    icon="i-lucide-upload"
                    size="lg"
                    color="primary"
                    :label="$t('pages.getting_started.import')"
                    @click="navigateTo('/import')"
                />
                <UButton
                    icon="i-lucide-user-plus"
                    size="lg"
                    variant="soft"
                    :label="$t('pages.getting_started.accounts')"
                    @click="goToAccounts"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const goToAccounts = () => {
    useState<string>('settingsActiveTab', () => 'accounts').value = 'accounts'
    navigateTo('/settings')
}
</script>
