<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';

// Define props received from App.vue
const props = defineProps<{
  providerOptions: Array<any>;
  setupProvider: string;
  setupModelId: string;
  setupApiKey: string;
  setupBaseUrl: string;
  setupCustomModelId: string;
  configError: string | null;
  selectedProviderDetails: Record<string, any> | undefined;
  availableModels: Array<any>;
}>();

// Define emits to send updates back to App.vue
const emit = defineEmits([
  'update:setupProvider',
  'update:setupModelId',
  'update:setupApiKey',
  'update:setupBaseUrl',
  'update:setupCustomModelId',
  'saveConfiguration',
]);

// Local computed properties or methods specific to SetupView can go here if needed
// For now, we directly use props and emit events

</script>

<template>
  <div class="px-1 pb-4">
    <h2 class="mb-3 text-lg font-light">Setup AI Provider</h2>
    <p class="text-sm mb-6" style="color: var(--vscode-descriptionForeground, #7f7f7f);">Please configure your AI provider to start using Apex Coder.</p>

    <!-- Provider Dropdown -->
    <div class="mb-4">
      <label for="provider-select" class="block mb-1.5 text-xs font-medium" style="color: var(--vscode-descriptionForeground, #7f7f7f);">Provider</label>
      <select
        id="provider-select"
        :value="props.setupProvider"
        @input="emit('update:setupProvider', ($event.target as HTMLSelectElement).value)"
        class="w-full p-2 border rounded-md box-border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        style="background-color: var(--vscode-input-background, white); color: var(--vscode-input-foreground, black); border-color: var(--vscode-input-border, #ccc);"
      >
        <option v-for="option in props.providerOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Model Dropdown (conditional) -->
    <div class="mb-4" v-if="props.setupProvider && props.availableModels.length > 0">
      <label for="modelId-select" class="block mb-1.5 text-xs font-medium" style="color: var(--vscode-descriptionForeground, #7f7f7f);">Model</label>
      <select
        id="modelId-select"
        :value="props.setupModelId"
        @input="emit('update:setupModelId', ($event.target as HTMLSelectElement).value)"
        class="w-full p-2 border rounded-md box-border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        style="background-color: var(--vscode-input-background, white); color: var(--vscode-input-foreground, black); border-color: var(--vscode-input-border, #ccc);"
      >
         <option v-for="model in props.availableModels" :key="model.value" :value="model.value">
           {{ model.label }}
         </option>
      </select>
    </div>

    <!-- Custom Model ID Input (conditional, e.g., for Ollama) -->
     <div class="mb-4" v-if="props.selectedProviderDetails?.allowCustomModel">
       <label for="customModelId" class="block mb-1.5 text-xs font-medium" style="color: var(--vscode-descriptionForeground, #7f7f7f);">Custom Model ID (if not in list)</label>
       <input
         type="text"
         id="customModelId"
         :value="props.setupCustomModelId"
         @input="emit('update:setupCustomModelId', ($event.target as HTMLInputElement).value)"
         placeholder="e.g., my-local-model:latest"
         class="w-full p-2 border rounded-md box-border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
         style="background-color: var(--vscode-input-background, white); color: var(--vscode-input-foreground, black); border-color: var(--vscode-input-border, #ccc);"
       >
     </div>

     <!-- API Key Input (conditional) -->
     <div class="mb-4" v-if="props.selectedProviderDetails?.requiresApiKey">
       <label for="apiKey" class="block mb-1.5 text-xs font-medium" style="color: var(--vscode-descriptionForeground, #7f7f7f);">API Key</label>
       <input
         type="password"
         id="apiKey"
         :value="props.setupApiKey"
         @input="emit('update:setupApiKey', ($event.target as HTMLInputElement).value)"
         placeholder="Enter your API Key"
         class="w-full p-2 border rounded-md box-border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
         style="background-color: var(--vscode-input-background, white); color: var(--vscode-input-foreground, black); border-color: var(--vscode-input-border, #ccc);"
       >
     </div>

     <!-- Base URL Input (conditional) -->
     <div class="mb-4" v-if="props.selectedProviderDetails?.requiresBaseUrl">
       <label for="baseUrl" class="block mb-1.5 text-xs font-medium" style="color: var(--vscode-descriptionForeground, #7f7f7f);">Base URL (Optional for Ollama)</label>
       <input
         type="text"
         id="baseUrl"
         :value="props.setupBaseUrl"
         @input="emit('update:setupBaseUrl', ($event.target as HTMLInputElement).value)"
         placeholder="e.g., http://localhost:11434"
         class="w-full p-2 border rounded-md box-border text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
         style="background-color: var(--vscode-input-background, white); color: var(--vscode-input-foreground, black); border-color: var(--vscode-input-border, #ccc);"
       >
     </div>

     <!-- Error Message -->
     <div v-if="props.configError" class="my-4 p-3 rounded-md text-xs" style="background-color: var(--vscode-inputValidation-errorBackground, #f8d7da); color: var(--vscode-inputValidation-errorForeground, #721c24); border: 1px solid var(--vscode-inputValidation-errorBorder, #f5c6cb);">
         Error: {{ props.configError }}
     </div>

    <button @click="emit('saveConfiguration')" class="w-full px-4 py-2 rounded-md cursor-pointer transition-colors duration-100 text-sm leading-snug disabled:opacity-50 disabled:cursor-not-allowed" style="background-color: var(--vscode-button-background, #007acc); color: var(--vscode-button-foreground, white); border: 1px solid var(--vscode-button-border, transparent); &:hover { background-color: var(--vscode-button-hoverBackground, #005a9e); }">Save Configuration</button>
  </div>
</template>