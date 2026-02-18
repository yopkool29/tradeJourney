<template>
    <div>
        <div class="flex items-center gap-4 mb-6">
            <h2 class="text-lg font-semibold">{{ $t('components.import.profiles.title') }}</h2>
            <UButton icon="i-lucide-plus" size="sm" @click="emit('add')">
                {{ $t('components.import.profiles.add_profile') }}
            </UButton>
        </div>

        <div v-if="profiles.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
            <UIcon name="i-lucide-inbox" class="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p class="text-lg font-medium mb-2">{{ $t('components.import.profiles.empty_title') }}</p>
            <p class="text-sm">{{ $t('components.import.profiles.empty_desc') }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UCard
                v-for="profile in profiles"
                :key="profile.id"
                class="hover:shadow-md transition-shadow"
                :ui="{ root: 'flex flex-col h-full', body: 'flex-grow' }"
            >
                <template #header>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <UIcon :name="getProviderIconWithMetadata(profile.provider, profile.metadata)" class="w-5 h-5 text-primary-500" />
                            <span class="font-semibold">{{ profile.name }}</span>
                        </div>
                        <UBadge variant="subtle" size="xs">{{ getProviderLabel(profile.provider) }}</UBadge>
                    </div>
                </template>

                <div class="space-y-2 text-sm text-secondary cursor-pointer" @click="emit('use', profile)">
                    <div class="flex justify-between">
                        <span>{{ $t('components.import.profiles.timezone') }}:</span>
                        <span class="font-medium text-gray-900 dark:text-white">
                            {{ profile.importMode === 'utc' ? `UTC${Number(profile.timezone) >= 0 ? '+' : ''}${profile.timezone}` : profile.timezone }}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span>{{ $t('components.import.profiles.keep_existing') }}:</span>
                        <UIcon
                            :name="profile.keepExistingTrades ? 'i-lucide-check' : 'i-lucide-x'"
                            :class="profile.keepExistingTrades ? 'text-green-500' : 'text-red-500'"
                            class="w-4 h-4"
                        />
                    </div>
                    <div v-if="profile.dayTags.length > 0" class="flex justify-between">
                        <span>{{ $t('components.import.profiles.day_tags') }}:</span>
                        <span class="font-medium">{{ profile.dayTags.length }}</span>
                    </div>
                    <div v-else class="flex justify-between">
                        <span>{{ $t('components.import.profiles.day_tags') }}:</span>
                        <span class="font-medium">0</span>
                    </div>
                    <div v-if="profile.tradeTags.length > 0" class="flex justify-between">
                        <span>{{ $t('components.import.profiles.trade_tags') }}:</span>
                        <span class="font-medium">{{ profile.tradeTags.length }}</span>
                    </div>
                    <div v-else class="flex justify-between">
                        <span>{{ $t('components.import.profiles.day_tags') }}:</span>
                        <span class="font-medium">0</span>
                    </div>

                    <div v-if="profile.provider === 'ibkr-api'" class="flex justify-between">
                        <span>IBKR Flex Query:</span>
                        <UIcon
                            :name="profile.ibkrFlexQueryToken && profile.ibkrFlexQueryId ? 'i-lucide-check' : 'i-lucide-x'"
                            :class="profile.ibkrFlexQueryToken && profile.ibkrFlexQueryId ? 'text-green-500' : 'text-red-500'"
                            class="w-4 h-4"
                        />
                    </div>
                </div>

                <template #footer>
                    <div class="flex gap-2">
                        <UButton size="xs" icon="i-lucide-play" @click="emit('use', profile)">
                            {{ $t('components.import.profiles.use') }}
                        </UButton>
                        <UButton size="xs" variant="soft" icon="i-lucide-pencil" @click="emit('edit', profile)">
                            {{ $t('components.import.profiles.edit') }}
                        </UButton>
                        <CommonModalDelete @confirm="emit('delete', profile.id)">
                            <template #trigger>
                                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash">
                                    {{ $t('components.import.profiles.delete') }}
                                </UButton>
                            </template>
                            <template #content>
                                {{ $t('components.import.profiles.confirm_delete', { name: profile.name }) }}
                            </template>
                        </CommonModalDelete>
                    </div>
                </template>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ImportProfileType } from '~/schema/importProfile'
import { getProviderIconWithMetadata, getProviderLabel } from '~/utils/import_utils'

defineProps<{
    profiles: ImportProfileType[]
}>()

const emit = defineEmits<{
    add: []
    use: [profile: ImportProfileType]
    edit: [profile: ImportProfileType]
    delete: [id: number]
}>()


</script>
