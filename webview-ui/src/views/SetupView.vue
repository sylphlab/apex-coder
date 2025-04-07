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
  <div class="flex flex-col items-center justify-center h-full px-6 py-8 animate-nordic-fade-in">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-light mb-2 text-nordic-text-primary">Configure AI Provider</h1>
      <p class="text-nordic-text-muted max-w-md text-center">
        Set up your preferred AI provider to start using Apex Coder
      </p>
    </div>

    <!-- Setup Form Card -->
    <div class="card-nordic w-full max-w-md animate-nordic-slide-up">
      <div class="p-6">
        <!-- Provider Dropdown -->
        <div class="mb-5">
          <label for="provider-select" class="block mb-2 text-sm font-medium text-nordic-text-primary">Provider</label>
          <select
            id="provider-select"
            :value="props.setupProvider"
            @input="emit('update:setupProvider', ($event.target as HTMLSelectElement).value)"
            class="input-nordic"
          >
            <option v-for="option in props.providerOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Model Dropdown (conditional) -->
        <div class="mb-5" v-if="props.setupProvider && props.availableModels.length > 0">
          <label for="modelId-select" class="block mb-2 text-sm font-medium text-nordic-text-primary">Model</label>
          <select
            id="modelId-select"
            :value="props.setupModelId"
            @input="emit('update:setupModelId', ($event.target as HTMLSelectElement).value)"
            class="input-nordic"
          >
            <option v-for="model in props.availableModels" :key="model.value" :value="model.value">
              {{ model.label }}
            </option>
          </select>
        </div>

        <!-- Custom Model ID Input (conditional, e.g., for Ollama) -->
        <div class="mb-5" v-if="props.selectedProviderDetails?.allowCustomModel">
          <label for="customModelId" class="block mb-2 text-sm font-medium text-nordic-text-primary">
            Custom Model ID <span class="text-nordic-text-muted">(if not in list)</span>
          </label>
          <input
            type="text"
            id="customModelId"
            :value="props.setupCustomModelId"
            @input="emit('update:setupCustomModelId', ($event.target as HTMLInputElement).value)"
            placeholder="e.g., my-local-model:latest"
            class="input-nordic"
          >
        </div>

        <!-- API Key Input (conditional) -->
        <div class="mb-5" v-if="props.selectedProviderDetails?.requiresApiKey">
          <label for="apiKey" class="block mb-2 text-sm font-medium text-nordic-text-primary">API Key</label>
          <input
            type="password"
            id="apiKey"
            :value="props.setupApiKey"
            @input="emit('update:setupApiKey', ($event.target as HTMLInputElement).value)"
            placeholder="Enter your API Key"
            class="input-nordic"
          >
        </div>

        <!-- Base URL Input (conditional) -->
        <div class="mb-5" v-if="props.selectedProviderDetails?.requiresBaseUrl">
          <label for="baseUrl" class="block mb-2 text-sm font-medium text-nordic-text-primary">
            Base URL <span class="text-nordic-text-muted">(Optional for Ollama)</span>
          </label>
          <input
            type="text"
            id="baseUrl"
            :value="props.setupBaseUrl"
            @input="emit('update:setupBaseUrl', ($event.target as HTMLInputElement).value)"
            placeholder="e.g., http://localhost:11434"
            class="input-nordic"
          >
        </div>

        <!-- Error Message -->
        <div v-if="props.configError" class="mb-5 p-4 rounded-lg text-sm bg-nordic-error bg-opacity-10 text-nordic-error border border-nordic-error border-opacity-20">
          <div class="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ props.configError }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col space-y-3">
          <button
            @click="emit('saveConfiguration')"
            class="btn-nordic-primary"
          >
            Save Configuration
          </button>
          <button
            @click="$router.push('/')"
            class="btn-nordic-ghost"
          >
            Back to Welcome
          </button>
        </div>
      </div>
    </div>

    <!-- Provider Info -->
    <div class="mt-8 text-center text-xs text-nordic-text-muted max-w-md">
      <p>Need help? Visit the documentation for your selected provider to get API keys and setup instructions.</p>
    </div>
  </div>
</template>