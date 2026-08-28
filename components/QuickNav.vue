<template>
    <div v-if="shortcuts.length > 0" class="container px-4 py-1.5 flex items-center gap-2">
        <UIcon name="i-lucide-zap" class="w-3.5 h-3.5 text-muted shrink-0" />
        <button
            v-for="item in shortcuts"
            :key="item.path"
            :class="[
                'inline-flex items-center gap-1.5 mr-1 px-2.5 py-1 text-xs font-medium rounded-md',
                'transition-all duration-150 ease-out whitespace-nowrap shrink-0 cursor-pointer',
                item.path === route.path
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-elevated text-muted border border-default hover:bg-primary/10 hover:text-primary hover:border-primary/20',
            ]"
            @click="navigateToShortcut(item)"
        >
            <UIcon :name="item.icon" class="w-3.5 h-3.5" />
            <span>{{ item.label }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { shortcuts, navigateToShortcut } = useQuickNav()
</script>
