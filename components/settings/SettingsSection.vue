<template>
	<UCard class="card-container-2xl">
		<template #header>
			<div class="header-layout">
				<span class="section-title">{{ title }}</span>
				<div class="flex items-center gap-2">
					<slot name="actions" />
					<UButton
						v-if="showRefresh"
						icon="i-lucide-refresh-cw"
						size="xs"
						variant="ghost"
						:loading="loading"
						@click="onRefresh"
					/>
				</div>
			</div>
		</template>

		<div class="p-4">
			<slot name="alert" />
			<slot />
		</div>
	</UCard>
</template>

<script setup lang="ts">
defineProps({
	title: {
		type: String,
		required: true,
	},
	showRefresh: {
		type: Boolean,
		default: false,
	},
	loading: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits<{
	refresh: [];
}>()

const onRefresh = useDebounce(() => {
	emit('refresh')
}, 300, { leading: true })

</script>
