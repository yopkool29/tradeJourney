<template>
    <div class="container mx-auto px-4 py-8">
        <div class="page-header">
            <h1 class="page-title">{{ $t('components.import.index.title') }}</h1>
        </div>
        <div class="mb-6">
            <div class="text-default">
                <p>{{ $t('components.import.index.intro') }}</p>
                <div class="p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded mb-4 mt-4">
                    <p class="font-semibold">{{ $t('components.import.index.warning_title') }}</p>
                    <p class="text-sm">{{ $t('components.import.index.warning_text') }}</p>
                    <p class="text-xs mt-1 italic">{{ $t('components.import.index.warning_note') }}</p>
                    <p class="text-xs mt-1 italic">{{ $t('components.import.index.timezone_warning') }}</p>
                </div>
            </div>
        </div>

        <CommonAlertBox :success-str="successStr" :error-str="errorStr" />

        <!-- Vue liste des profils -->
        <ImportProfileList
            v-if="currentView === 'list'"
            :profiles="profiles"
            @add="showAddForm"
            @use="onUseProfile"
            @edit="showEditForm"
            @delete="onDeleteProfile"
        />

        <!-- Vue formulaire (ajout/édition) -->
        <ImportProfileForm
            v-else-if="currentView === 'form'"
            :profile="editingProfile"
            :tag-groups="tagGroups"
            @cancel="currentView = 'list'"
            @save="onSaveProfile"
        />

        <!-- Vue exécution d'import -->
        <ImportProfileExecute
            v-else-if="currentView === 'execute' && activeProfile"
            :profile="activeProfile"
            @back="currentView = 'list'"
            @imported="onImported"
        />
    </div>
</template>

<script setup lang="ts">
import type { ImportProfileType, CreateImportProfileType, UpdateImportProfileType } from '~/schema/importProfile'
import type { TagGroupType } from '~/schema/tagGroup'

const { profiles, fetchProfiles, createProfile, updateProfile, deleteProfile } = useImportProfiles()
const { fetchGroups } = useTags()
const { errorStr, successStr, displayMessage } = useAlert()
const { t } = useI18n()
const userStore = useUserStore()

const tagGroups = ref<TagGroupType[]>([])

type ViewMode = 'list' | 'form' | 'execute'
const currentView = ref<ViewMode>('list')
const editingProfile = ref<ImportProfileType | null>(null)
const activeProfile = ref<ImportProfileType | null>(null)

onMounted(async () => {
    await Promise.all([
        fetchProfiles(),
        fetchGroups().then((groups) => {
            tagGroups.value = groups
        }),
    ])
})

function showAddForm() {
    editingProfile.value = null
    currentView.value = 'form'
}

function showEditForm(profile: ImportProfileType) {
    editingProfile.value = profile
    currentView.value = 'form'
}

function onUseProfile(profile: ImportProfileType) {
    activeProfile.value = profile
    currentView.value = 'execute'
}

async function onSaveProfile(data: CreateImportProfileType & { id?: number }) {
    displayMessage(null, null)
    try {
        if (data.id) {
            await updateProfile({ ...data, id: data.id } as UpdateImportProfileType)
        } else {
            await createProfile(data)
        }

        await fetchProfiles()

        const msg = t('components.import.profiles.toast_saved')
        displayMessage(msg, null)

        currentView.value = 'list'
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
    }
}

async function onDeleteProfile(id: number) {
    displayMessage(null, null)
    try {
        await deleteProfile(id)
        await fetchProfiles()

        const msg = t('components.import.profiles.toast_deleted')
        displayMessage(msg, null)
    } catch (err) {
        const { message } = catchTagMessage(err, t)
        displayMessage(null, message)
    }
}

async function onImported() {
    userStore.triggerDataRefresh()
    await navigateTo('/main')
}
</script>

