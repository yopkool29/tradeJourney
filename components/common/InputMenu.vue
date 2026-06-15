<template>
    <div class="flex items-center gap-2" :class="widthClass">
        <UInput
            v-model="modelValue"
            :placeholder="placeholder"
            :list="listId"
            class="flex-1"
            @blur="saveToHistory"
            @change="saveToHistory"
        />
        <datalist :id="listId">
            <option v-for="item in items" :key="item" :value="item" />
        </datalist>
        <button type="button" class="p-1 text-red-500 hover:text-red-700 shrink-0" @click.stop="modelValue = ''">
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
        </button>
    </div>
</template>

<script setup lang="ts">
interface Props {
    name?: string
    placeholder?: string
    width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const props = withDefaults(defineProps<Props>(), {
    name: 'default',
    placeholder: '',
    width: 'full',
})

const dbStateStore = useDbStateStore()

const effectiveName = computed(() => props.name || 'default')
const listId = computed(() => `input-history-${effectiveName.value}`)

const items = computed(() => dbStateStore.getCustomInput(effectiveName.value).items)

const modelValue = defineModel<string>({ default: '' })

const widthClass = computed(() => {
    const classes = {
        xs: 'w-20',
        sm: 'w-32',
        md: 'w-48',
        lg: 'w-64',
        xl: 'w-80',
        full: 'w-full',
    }
    return classes[props.width]
})

const saveToHistory = () => {
    const val = modelValue.value?.trim()
    if (val) {
        dbStateStore.addCustomItem(effectiveName.value, val)
    }
}
</script>
