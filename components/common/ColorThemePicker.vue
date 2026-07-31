<template>
	<div class="space-y-2 max-w-[400px]">
		<p class="text-sm font-medium">{{ label }}</p>
		<div class="grid grid-cols-4 gap-4">
			<CommonColorPickerButton
				v-for="t in themes"
				:key="t.key"
				v-model="modelValue[t.key]"
				:label="`${label} [${t.label}]`"
				:default-color="defaultColors[t.key]"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
type ThemeKey = 'light' | 'dark' | 'light-blue' | 'dark-gold'
type ThemeColors = Record<ThemeKey, string>

const modelValue = defineModel<ThemeColors>({ required: true })

defineProps<{
	label: string
	defaultColors: ThemeColors
}>()

const themes = [
	{ key: 'light' as ThemeKey, label: 'Light' },
	{ key: 'light-blue' as ThemeKey, label: 'Light Blue' },
	{ key: 'dark' as ThemeKey, label: 'Dark' },
	{ key: 'dark-gold' as ThemeKey, label: 'Dark Gold' },
]
</script>
