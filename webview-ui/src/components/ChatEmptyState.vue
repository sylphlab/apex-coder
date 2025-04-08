<script setup lang="ts">
// No props or emits needed for this simple component
</script>

<template>
 <div class="h-full flex flex-col items-center justify-center text-nordic-text-muted pt-10 pb-20">
    <div class="w-12 h-12 mb-3 rounded-full bg-nordic-bg flex items-center justify-center">
      <span class="i-carbon-chat w-6 h-6 text-nordic-text-muted/80"></span>
    </div>
    <p class="text-sm mb-1">Start Chatting</p>
    <p class="text-xs max-w-xs text-center">Send a message, paste an image, or upload one.</p>
  </div>
</template>

<style scoped>
 /* Ensure UnoCSS Icons work */
[class^="i-"], [class*=" i-"] {
  display: inline-block;
  vertical-align: middle;
}
</style> 