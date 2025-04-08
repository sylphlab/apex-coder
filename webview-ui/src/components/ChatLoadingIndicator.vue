<script setup lang="ts">
defineProps<{
  thinkingStepText: string | null;
}>();
</script>

<template>
  <div class="flex justify-start mt-5 mb-2 pl-2">
    <div
      class="flex items-center space-x-2 text-xs text-nordic-text-muted animate-pulse"
    >
      <span class="i-carbon-circle-dash w-4 h-4 animate-spin"></span>
      <span>{{ thinkingStepText || "Thinking..." }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Ensure UnoCSS Icons work */
[class^="i-"],
[class*=" i-"] {
  display: inline-block;
  vertical-align: middle;
}
/* Pulse animation might be defined globally or needed here */
/* @keyframes pulse { ... } */
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
/* Spin animation */
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
