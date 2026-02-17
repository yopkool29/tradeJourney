<template>
    <div class="flex items-center">
        <USelectMenu
            v-model="modelValue"
            :search-input="{
                placeholder: placeholder,
                icon: 'i-lucide-search',
            }"
            :create-item="{
                position: position,
                when: when,
            }"
            :items="items"
            :ui="{
                trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-100',
            }"
            :class="[widthClass, sizeClass, classDefault]"
            :autofocus="autofocus"
            @create="handleCreate"
        >
            <template #item="{ item }">
                <div class="flex items-center justify-between w-full">
                    <span>{{ item }}</span>
                    <button type="button" class="ml-2 p-1 text-red-500 hover:text-red-700" @click.stop="handleRemove(item)">
                        <UIcon name="i-heroicons-trash" class="w-3 h-3" />
                    </button>
                </div>
            </template>
        </USelectMenu>
        <button type="button" class="ml-2 p-1 text-red-500 hover:text-red-700" @click.stop="modelValue = ''">
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
        </button>
    </div>
</template>

<script setup lang="ts">
interface Props {
    name?: string
    placeholder?: string
    position?: 'top' | 'bottom'
    when?: 'empty' | 'always'
    width?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    classDefault?: string
    autofocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    name: 'default',
    placeholder: 'Sélectionnez une option...',
    position: 'bottom',
    when: 'always',
    width: 'md',
    size: 'md',
    classDefault: 'min-h-8',
    autofocus: false,
})

const userStore = useUserStore()

const items = computed(() => userStore.getCustomInput(props.name).items)

const modelValue = defineModel<string>('modelValue', {
    required: false,
    default: '',
})

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

const sizeClass = computed(() => {
    const classes = {
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
    }
    return classes[props.size]
})

function handleRemove(item: string) {
    userStore.removeCustomItem(props.name, item)
}

function handleCreate(item: string) {
    userStore.addCustomItem(props.name, item)
    modelValue.value = item
}
</script>
