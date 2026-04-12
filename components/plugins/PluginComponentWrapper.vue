<template>
	<component :is="resolvedComponent" v-bind="$attrs" />
</template>

<script setup lang="ts">
const props = defineProps<{
	componentName: string
}>()

const resolvedComponent = computed(() => {
	switch (props.componentName) {
		case 'UIcon':
			return resolveComponent('UIcon')
		case 'UCard':
			return resolveComponent('UCard')
		case 'UDivider':
			return resolveComponent('UDivider')
		case 'UButton':
			return resolveComponent('UButton')
		case 'USpinner':
			return resolveComponent('USpinner')
		case 'UAlert':
			return resolveComponent('UAlert')
		case 'USwitch':
			return resolveComponent('USwitch')
		case 'UBadge':
			return resolveComponent('UBadge')
		case 'UProgress':
			return resolveComponent('UProgress')
		default:
			return null
	}
})
</script>
