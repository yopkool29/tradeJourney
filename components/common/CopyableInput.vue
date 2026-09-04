<template>
	<div class="flex gap-2">
		<UInput
			:model-value="modelValue"
			:readonly="readonly"
			:type="isPassword && !revealed ? 'password' : 'text'"
			:placeholder="placeholder"
			:autocomplete="autocomplete"
			class="flex-1"
			:class="inputClass"
			@update:model-value="$emit('update:modelValue', $event)"
		/>
		<UTooltip v-if="isPassword" :text="revealed ? $t('common.actions.hide') : $t('common.actions.show')">
			<UButton
				color="neutral"
				variant="soft"
				:icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
				@click="revealed = !revealed"
			/>
		</UTooltip>
		<UTooltip :text="$t('common.actions.copy')">
			<UButton
				color="neutral"
				variant="soft"
				icon="i-lucide-copy"
				@click="copyToClipboard(modelValue)"
			/>
		</UTooltip>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
	defineProps<{
		modelValue: string
		type?: 'text' | 'password'
		readonly?: boolean
		placeholder?: string
		autocomplete?: string
		inputClass?: string
	}>(),
	{
		type: 'text',
		readonly: false,
		placeholder: undefined,
		autocomplete: undefined,
		inputClass: undefined,
	},
)

defineEmits<{
	'update:modelValue': [value: string]
}>()

const isPassword = props.type === 'password'
const revealed = ref(false)

const copyToClipboard = async (text: string) => {
	try {
		await navigator.clipboard.writeText(text)
	} catch {
		// fallback
		const ta = document.createElement('textarea')
		ta.value = text
		document.body.appendChild(ta)
		ta.select()
		document.execCommand('copy')
		document.body.removeChild(ta)
	}
}
</script>
