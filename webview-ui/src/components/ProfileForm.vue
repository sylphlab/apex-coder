<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import type { AssistantProfile } from '../types/assistantProfile';
import { v4 as uuidv4 } from 'uuid';

// --- Form State ---
const formProfile = ref<Partial<AssistantProfile>>({});
const availableProviders = ref<{id: string, name: string}[]>([]); // TODO: Populate this
const availableTools = ref<string[]>([]); // Get dynamically
const isLoadingTools = ref(false);

// TODO: Fetch available providers and tools on mount
onMounted(() => {
  // Placeholder - Fetch or define available providers/tools
  availableProviders.value = [
    { id: 'google', name: 'Google AI' },
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' },
    { id: 'ollama', name: 'Ollama' },
    // Add other providers from design doc/config
  ];
  // Request available tools
  isLoadingTools.value = true;
  try {
      console.log('[ProfileForm] Requesting available tools...');
      // Assuming vscode is globally available or injected
      (window as any).vscode?.postMessage({ command: 'getAvailableTools' });
  } catch (e) {
      console.error('[ProfileForm] Error requesting tools:', e);
      isLoadingTools.value = false; // Handle error state if needed
  }

  // Add listener for the tools list response
  window.addEventListener('message', toolMessageListener);
});

// Listener specifically for tool list
const toolMessageListener = (event: MessageEvent) => {
    const message = event.data;
    if (message.command === 'availableToolsList') {
        console.log('[ProfileForm] Received available tools:', message.payload);
        availableTools.value = message.payload || [];
        isLoadingTools.value = false;
        // Clean up listener after receiving the list
        window.removeEventListener('message', toolMessageListener);
    }
    // TODO: Handle potential error message for tool fetching
};

// Cleanup listener on unmount
onUnmounted(() => {
    window.removeEventListener('message', toolMessageListener);
});
</script>

<template>
  <!-- Allowed Tools -->
  <fieldset class="border border-[var(--vscode-input-border)] p-3 rounded">
      <legend class="text-sm font-medium px-1">Allowed Tools</legend>
      <div v-if="isLoadingTools" class="text-sm text-center p-2">Loading tools...</div>
      <div v-else class="max-h-48 overflow-y-auto space-y-1 mt-1">
          <div v-for="tool in availableTools" :key="tool" class="flex items-center">
              <input 
  </fieldset>
</template> 