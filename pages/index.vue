<template>
    <div class="flex flex-col items-center justify-center min-h-screen px-4 py-8">
        <div class="flex flex-col items-center mb-8">
            <AppLogo :width="220" :height="70" class="mb-4" />
            <p class="text-xl text-secondary">{{ $t('pages.index.subtitle') }}</p>
        </div>

        <UCard class="max-w-md w-full mb-8">
            <div class="p-2">
                <div class="flex flex-col items-center mb-6">
                    <UIcon name="i-heroicons-chart-bar" class="size-16 text-primary mb-4" />
                    <h2 class="text-2xl font-semibold">{{ $t('pages.index.journal_title') }}</h2>
                    <p class="text-secondary mt-2 text-center">{{ $t('pages.index.journal_description') }}</p>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-arrow-up-tray" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_import') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-chart-pie" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_analysis') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-squares-2x2" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_organization') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-camera" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_screenshots') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-calendar-days" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_calendar') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-puzzle-piece" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_plugins') }}</span>
                    </div>
                    <div class="flex items-center">
                        <UIcon name="i-heroicons-server-stack" class="text-success mr-3 size-6" />
                        <span>{{ $t('pages.index.feature_multi') }}</span>
                    </div>
                </div>

                <div class="mt-8 flex justify-center">
                    <UButton to="/login" color="primary" size="lg" icon="i-heroicons-arrow-right-circle"
                        class="transition-transform hover:scale-105 active:scale-100">
                        {{ $t('pages.index.start_button') }}
                    </UButton>
                </div>
            </div>
        </UCard>

        <div class="flex flex-col items-center gap-2">
            <div class="text-secondary-sm">
                {{ $t('pages.index.already_user') }} <UButton to="/login" variant="link" color="primary">{{
                    $t('pages.index.login_link') }}</UButton>
            </div>
            <UButton
                :to="$t('pages.index.doc_url')"
                target="_blank"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-book-open"
                size="sm"
            >
                {{ $t('pages.index.doc_link') }}
            </UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
onMounted(() => {
    const { stopLoading } = useGlobalLoading()
    stopLoading()
})
</script>
