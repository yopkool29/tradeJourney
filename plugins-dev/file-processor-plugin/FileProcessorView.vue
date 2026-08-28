<template>
    <div class="space-y-4">
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Upload File</label>
                <UIInput id="file-input" type="file" @change="handleFileUpload" />
                <p v-if="file" class="mt-2 text-sm text-muted">Selected: {{ file.name }}</p>
            </div>

            <div v-if="file" class="space-y-4">
                <div>
                    <p class="text-xs text-muted uppercase tracking-wide mb-2">Original Content</p>
                    <pre class="bg-elevated p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">{{ fileContent }}</pre>
                </div>

                <div class="flex gap-2">
                    <UIButton color="primary" @click="processFile">Process File</UIButton>
                    <UIButton :disabled="!processedContent" color="primary" @click="downloadFile">Download</UIButton>
                    <UIButton color="red" @click="reset">Reset</UIButton>
                </div>

                <div v-if="processedContent">
                    <p class="text-xs text-muted uppercase tracking-wide mb-2">Processed Content</p>
                    <pre class="bg-elevated p-3 rounded text-sm overflow-x-auto max-h-60 overflow-y-auto">{{ processedContent }}</pre>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UIButton from '../ui/UIButton.vue'
import UIInput from '../ui/UIInput.vue'

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
