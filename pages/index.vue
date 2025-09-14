<template>
    <div class="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50 dark:bg-gray-900">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-3 text-primary-600 dark:text-primary-400">{{ $t('pages.index.title') }}</h1>
            <p class="text-xl text-gray-600 dark:text-gray-400">{{ $t('pages.index.subtitle') }}</p>
        </div>

        <UCard class="max-w-md w-full shadow-lg dark:shadow-gray-800/30 mb-8">
            <div class="p-2">
                <div class="flex flex-col items-center mb-6">
                    <UIcon name="i-heroicons-chart-bar" class="size-16 text-primary-500 mb-4" />
                    <h2 class="text-2xl font-semibold">{{ $t('pages.index.journal_title') }}</h2>
                    <p class="text-gray-600 dark:text-gray-400 mt-2 text-center">{{ $t('pages.index.journal_description') }}</p>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-check-circle" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_import') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-check-circle" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_analysis') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-check-circle" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_organization') }}</span>
                    </div>
                </div>

                <div class="mt-8 flex justify-center">
                    <UButton
                        to="/login"
                        color="primary"
                        size="lg"
                        icon="i-heroicons-arrow-right-circle"
                        class="transition-transform hover:scale-105 active:scale-100"
                    >
                        {{ $t('pages.index.start_button') }}
                    </UButton>
                </div>
            </div>
        </UCard>

        <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ $t('pages.index.already_user') }} <UButton to="/login" variant="link" color="primary">{{ $t('pages.index.login_link') }}</UButton>
        </div>
    </div>
</template>

<script setup lang="ts"></script>
