<template>
	<component :is="resolvedComponent" v-bind="$attrs" />
</template>

<script setup lang="ts">
import type { Component, VNode } from 'vue'

const props = defineProps<{
	component: Component
	sdk: {
		ui: {
			components: Record<string, (props: Record<string, unknown>) => VNode>
		}
	}
}>()

// Create a wrapper that provides the component resolution
const resolvedComponent = computed(() => {
	if (!props.component) return null
	
	// Return the component with a wrapper that resolves UI components
	return defineComponent({
		...props.component,
		setup() {
			const originalSetup = (props.component as Component).setup
			if (originalSetup) {
				const result = originalSetup()
				
				// Override the sdk.ui.components with actual resolved components
				if (result?.sdk?.ui?.components) {
					result.sdk.ui.components = {
						UIcon: resolveComponent('UIcon'),
						UCard: resolveComponent('UCard'),
						UDivider: resolveComponent('UDivider'),
						UButton: resolveComponent('UButton'),
						USpinner: resolveComponent('USpinner'),
						UAlert: resolveComponent('UAlert'),
						USwitch: resolveComponent('USwitch'),
						UBadge: resolveComponent('UBadge'),
						UProgress: resolveComponent('UProgress'),
					}
				}
				
				return result
			}
			
			return {}
		}
	})
})
</script>
