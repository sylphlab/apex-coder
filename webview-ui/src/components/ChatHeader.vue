<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: "getConfigStatus"): void;
  (e: "changeSettings"): void;
}>();

// Assuming router is available globally or passed down if needed for api-keys
// For simplicity, let's keep the router push logic here for now
import { useRouter } from "vue-router";
const router = useRouter();
</script>

<template>
  <div class="absolute top-1 right-1 z-10 flex items-center space-x-2">
    <button
      @click="emit('getConfigStatus')"
      :disabled="props.isLoading"
      class="btn-nordic-ghost-sm"
      :class="{ 'opacity-50 cursor-not-allowed': props.isLoading }"
      title="Refresh Status"
    >
      <span class="i-carbon-update-now w-4 h-4"></span>
    </button>
    <button
      @click="router.push('/api-keys')"
      class="btn-nordic-ghost-sm"
      title="Manage API Keys"
    >
      <span class="i-carbon-credentials w-4 h-4"></span>
    </button>
    <button
      @click="emit('changeSettings')"
      class="btn-nordic-ghost-sm"
      title="Change Settings"
    >
      <span class="i-carbon-settings w-4 h-4"></span>
    </button>
  </div>
</template>

<style scoped>
.btn-nordic-ghost-sm {
  @apply p-1.5 rounded text-nordic-text-secondary hover:bg-nordic-bg-hover hover:text-nordic-text transition-colors duration-150;
}
/* Ensure UnoCSS Icons work */
[class^="i-"],
[class*=" i-"] {
  display: inline-block;
  vertical-align: middle;
}
</style>
