<template>
    <div class="space-y-4">
        <component :is="sdk.ui.components.UCard">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Upload File</label>
                    <input
                        id="file-input"
                        type="file"
                        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                        @change="handleFileUpload"
                    />
                    <p v-if="file" class="mt-2 text-sm text-gray-500 dark:text-gray-400">Selected: {{ file.name }}</p>
                </div>

                <div v-if="file" class="space-y-4">
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Original Content</p>
                        <pre class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">{{ fileContent }}</pre>
                    </div>

                    <div class="flex gap-2">
                        <component :is="sdk.ui.components.UButton" @click="processFile"> Process File </component>
                        <component :is="sdk.ui.components.UButton" :disabled="!processedContent" color="green" @click="downloadFile">
                            Download
                        </component>
                        <component :is="sdk.ui.components.UButton" color="red" variant="ghost" @click="reset"> Reset </component>
                    </div>

                    <div v-if="processedContent">
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Processed Content</p>
                        <pre class="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">{{
                            processedContent
                        }}</pre>
                    </div>
                </div>
            </div>
        </component>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TJPluginSdk } from '~/type/plugin'

const { sdk } = defineProps<{ sdk: TJPluginSdk }>()

const file = ref<File | null>(null)
const fileContent = ref<string>('')
const processedContent = ref<string>('')

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const selectedFile = target.files?.[0]
    if (selectedFile) {
        file.value = selectedFile
        const reader = new FileReader()
        reader.onload = (e) => {
            fileContent.value = e.target?.result as string
            processedContent.value = e.target?.result as string
        }
        reader.readAsText(selectedFile)
    }
}

const processFile = () => {
    if (!fileContent.value) return

    processedContent.value = fileContent.value.toUpperCase()
}

const downloadFile = () => {
    if (!processedContent.value || !file.value) return

    const blob = new Blob([processedContent.value], { type: file.value.type || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `processed_${file.value.name}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const reset = () => {
    file.value = null
    fileContent.value = ''
    processedContent.value = ''
}
</script>
