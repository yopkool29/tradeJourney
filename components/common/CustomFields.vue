<template>
	<div class="custom-fields-container">
		<div class="custom-fields-header">
			<UButton
				v-if="!isExpanded"
				size="xs"
				variant="ghost"
				color="neutral"
				icon="i-lucide-pencil"
				@click="isExpanded = true"
			>
				{{ $t('components.common.customFields.edit') }}
			</UButton>
			<UButton
				v-else
				size="xs"
				variant="ghost"
				color="neutral"
				icon="i-lucide-chevron-up"
				@click="isExpanded = false"
			>
				{{ $t('components.common.customFields.collapse') }}
			</UButton>
		</div>

		<!-- Replié : résumé lecture seule -->
		<div v-if="!isExpanded" class="custom-fields-summary">
			<span v-if="modelValue.length === 0" class="text-secondary text-sm">{{ $t('components.common.customFields.empty') }}</span>
			<div v-else class="flex flex-col gap-1">
				<div v-for="(field, index) in modelValue" :key="index" class="text-sm text-secondary">
					<span class="font-medium">{{ field.key }}</span>: {{ field.value || '—' }}
				</div>
			</div>
		</div>

		<!-- Messages d'erreur -->
		<p v-if="hasDuplicates" class="text-xs text-error mt-1">{{ $t('components.common.customFields.duplicate_key_error') }}</p>
		<p v-if="hasEmptyKeys" class="text-xs text-error mt-1">{{ $t('components.common.customFields.empty_key_error') }}</p>

		<!-- Déplié : édition -->
		<div v-if="isExpanded" class="custom-fields-edit">
			<!-- Champ fixe (firstFieldKey) -->
			<div v-if="props.firstFieldKey" class="custom-field-row">
				<span class="custom-field-key-fixed">{{ props.firstFieldKey }}</span>
				<UInput
					:model-value="firstFieldValue"
					class="custom-field-value-input"
					:placeholder="$t('components.common.customFields.value_placeholder')"
					@update:model-value="updateFirstField"
				/>
			</div>

			<!-- Champs libres -->
			<div v-for="(field, index) in freeFields" :key="index" class="custom-field-row">
				<UInput
					v-model="freeFields[index].key"
					class="custom-field-key-input"
					:placeholder="$t('components.common.customFields.key_placeholder')"
					:color="isDuplicateKey(freeFields[index].key, index) || !freeFields[index].key.trim() ? 'error' : undefined"
					@update:model-value="emitUpdate"
				/>
				<UInput
					v-model="freeFields[index].value"
					class="custom-field-value-input"
					:placeholder="$t('components.common.customFields.value_placeholder')"
					@update:model-value="emitUpdate"
				/>
				<UButton
					size="xs"
					variant="ghost"
					color="error"
					icon="i-lucide-trash-2"
					@click="removeField(index)"
				/>
			</div>

			<UButton
				size="xs"
				variant="soft"
				color="neutral"
				icon="i-lucide-plus"
				:disabled="modelValue.length >= maxFields"
				@click="addField"
			>
				{{ $t('components.common.customFields.add') }}
			</UButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { CustomField } from '~/schema/symbol'

const props = defineProps<{
	modelValue: CustomField[]
	firstFieldKey?: string
}>()

const hasDuplicates = computed(() => {
	const allKeys = props.modelValue.map(f => f.key.trim().toLowerCase()).filter(k => k)
	return allKeys.length !== new Set(allKeys).size
})

const hasEmptyKeys = computed(() => {
	const freeKeys = props.firstFieldKey ? props.modelValue.slice(1) : props.modelValue
	return freeKeys.some(f => !f.key.trim())
})

const hasErrors = computed(() => hasDuplicates.value || hasEmptyKeys.value)

const emit = defineEmits<{
	'update:modelValue': [value: CustomField[]]
}>()

const maxFields = 5
const isExpanded = ref(false)

const isDuplicateKey = (key: string, index: number) => {
	if (!key.trim()) return false
	const normalizedKey = key.trim().toLowerCase()
	if (props.firstFieldKey && normalizedKey === props.firstFieldKey.toLowerCase()) return true
	return freeFields.value.some((f, i) => i !== index && f.key.trim().toLowerCase() === normalizedKey)
}

const firstFieldValue = computed(() => {
	if (!props.firstFieldKey) return ''
	return props.modelValue.find(f => f.key === props.firstFieldKey)?.value ?? ''
})

const freeFields = computed({
	get: () => {
		if (!props.firstFieldKey) return [...props.modelValue]
		return props.modelValue.slice(1)
	},
	set: (fields: CustomField[]) => {
		if (!props.firstFieldKey) {
			emit('update:modelValue', fields)
			return
		}
		const firstField = { key: props.firstFieldKey, value: firstFieldValue.value }
		emit('update:modelValue', [firstField, ...fields])
	}
})

const updateFirstField = (value: string) => {
	if (!props.firstFieldKey) return
	const existing = props.modelValue.slice(1)
	emit('update:modelValue', [{ key: props.firstFieldKey, value }, ...existing])
}

const emitUpdate = () => {
	if (!props.firstFieldKey) {
		emit('update:modelValue', [...freeFields.value])
		return
	}
	const firstField = { key: props.firstFieldKey, value: firstFieldValue.value }
	emit('update:modelValue', [firstField, ...freeFields.value])
}

const addField = () => {
	if (props.modelValue.length >= maxFields) return
	const newFreeFields = [...freeFields.value, { key: '', value: '' }]
	freeFields.value = newFreeFields
}

const removeField = (index: number) => {
	const newFreeFields = freeFields.value.filter((_, i) => i !== index)
	freeFields.value = newFreeFields
}

defineExpose({ hasErrors })
</script>

<style scoped>
.custom-fields-container {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.custom-fields-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.custom-fields-summary {
	padding: 0.375rem 0;
}

.custom-fields-edit {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	padding-top: 0.25rem;
}

.custom-field-row {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.custom-field-key-fixed {
	min-width: 80px;
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-gray-600);
	flex-shrink: 0;
}

.custom-field-key-input {
	width: 120px;
	flex-shrink: 0;
}

.custom-field-value-input {
	flex: 1;
}
</style>
