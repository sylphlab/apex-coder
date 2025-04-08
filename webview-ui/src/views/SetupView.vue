<script setup lang="ts">
import { computed } from "vue"; // Removed defineProps, defineEmits, ref, onMounted, watch
import { storeToRefs } from "pinia";
import { useConfigStore } from "../stores/configStore";
// Removed ProviderService import, store handles it
// Use the config store
const configStore = useConfigStore();

// Get reactive state and computed properties from the store
const {
  providers,
  models,
  isLoadingProviders,
  isLoadingModels,
  loadingError, // Can display this if needed
  configError,
  setupProvider,
  setupModelId,
  setupApiKey,
  setupBaseUrl,
  setupCustomModelId,
  selectedProviderDetails, // Use the computed property from the store
} = storeToRefs(configStore);

// Get the save action from the store
const { saveConfiguration, fetchProviders } = configStore; // Added fetchProviders

// Props and emits are no longer needed

// Local state, onMounted, watch, and local computed properties are removed
// as this logic is now handled within the configStore.
// The store fetches providers on init and watches setupProvider internally.
// selectedProviderDetails is now directly from the store.
</script>
<template>
  <div
    class="flex flex-col items-center justify-center h-full px-6 py-8 animate-nordic-fade-in"
  >
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-light mb-2 text-nordic-text-primary">
        Configure AI Provider
      </h1>
      <p class="text-nordic-text-muted max-w-md text-center">
        Set up your preferred AI provider to start using Apex Coder
      </p>
    </div>

    <!-- Setup Form Card -->
    <div class="card-nordic w-full max-w-md animate-nordic-slide-up">
      <div class="p-6">
        <!-- Provider Dropdown -->
        <div class="mb-5">
          <div class="flex items-center justify-between mb-2">
            <label
              for="provider-select"
              class="text-sm font-medium text-nordic-text-primary"
              >Provider</label
            >
            <button
              @click="fetchProviders"
              :disabled="isLoadingProviders"
              class="btn-nordic-ghost p-1 rounded-full text-nordic-text-muted hover:text-nordic-primary hover:bg-nordic-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh providers"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div
            v-if="isLoadingProviders"
            class="flex items-center space-x-2 text-nordic-text-muted text-sm py-2"
          >
            <div
              class="animate-spin h-4 w-4 border-2 border-nordic-primary border-t-transparent rounded-full"
            ></div>
            <span>Loading providers...</span>
          </div>
          <select
            v-else
            id="provider-select"
            :value="setupProvider"
            @input="setupProvider = ($event.target as HTMLSelectElement).value"
            class="input-nordic"
          >
            <option value="" :disabled="providers.length === 0">
              {{
                providers.length === 0
                  ? "No providers found"
                  : "-- Select Provider --"
              }}
            </option>
            <option
              v-for="provider in providers"
              :key="provider.id"
              :value="provider.id"
            >
              {{ provider.name }}
            </option>
          </select>
        </div>

        <!-- Model Dropdown (conditional on provider selection) -->
        <div class="mb-5" v-if="setupProvider">
          <label
            for="modelId-select"
            class="block mb-2 text-sm font-medium text-nordic-text-primary"
            >Model</label
          >
          <div
            v-if="isLoadingModels"
            class="flex items-center space-x-2 text-nordic-text-muted text-sm py-2"
          >
            <div
              class="animate-spin h-4 w-4 border-2 border-nordic-primary border-t-transparent rounded-full"
            ></div>
            <span>Loading models...</span>
          </div>
          <select
            v-else-if="models.length > 0"
            id="modelId-select"
            :value="setupModelId"
            @input="setupModelId = ($event.target as HTMLSelectElement).value"
            class="input-nordic"
          >
            <option value="">-- Select Model --</option>
            <option v-for="model in models" :key="model.id" :value="model.id">
              {{ model.name
              }}{{ model.description ? ` (${model.description})` : "" }}
            </option>
          </select>
          <p v-else class="text-sm text-nordic-text-muted py-2">
            No models available for this provider.
          </p>
        </div>

        <!-- Custom Model ID Input (conditional based on provider details from store) -->
        <div class="mb-5" v-if="selectedProviderDetails?.allowCustomModel">
          <label
            for="customModelId"
            class="block mb-2 text-sm font-medium text-nordic-text-primary"
          >
            Custom Model ID
            <span class="text-nordic-text-muted">(if not in list)</span>
          </label>
          <input
            type="text"
            id="customModelId"
            :value="setupCustomModelId"
            @input="
              setupCustomModelId = ($event.target as HTMLInputElement).value
            "
            placeholder="e.g., my-local-model:latest"
            class="input-nordic"
          />
        </div>

        <!-- API Key Input (conditional based on provider details from store) -->
        <div class="mb-5" v-if="selectedProviderDetails?.requiresApiKey">
          <label
            for="apiKey"
            class="block mb-2 text-sm font-medium text-nordic-text-primary"
            >API Key</label
          >
          <input
            type="password"
            id="apiKey"
            :value="setupApiKey"
            @input="setupApiKey = ($event.target as HTMLInputElement).value"
            placeholder="Enter your API Key"
            class="input-nordic"
          />
        </div>

        <!-- Base URL Input (conditional based on provider details from store) -->
        <div class="mb-5" v-if="selectedProviderDetails?.requiresBaseUrl">
          <label
            for="baseUrl"
            class="block mb-2 text-sm font-medium text-nordic-text-primary"
          >
            Base URL
            <span class="text-nordic-text-muted">(Optional for Ollama)</span>
          </label>
          <input
            type="text"
            id="baseUrl"
            :value="setupBaseUrl"
            @input="setupBaseUrl = ($event.target as HTMLInputElement).value"
            placeholder="e.g., http://localhost:11434"
            class="input-nordic"
          />
        </div>

        <!-- Error Message (from store) -->
        <div
          v-if="configError"
          class="mb-5 p-4 rounded-lg text-sm bg-nordic-error bg-opacity-10 text-nordic-error border border-nordic-error border-opacity-20"
        >
          <div class="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span>{{ configError }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col space-y-3">
          <button @click="saveConfiguration" class="btn-nordic-primary">
            Save Configuration
          </button>
          <button
            @click="$router.push('/api-keys')"
            class="btn-nordic-secondary"
          >
            Manage All API Keys
          </button>
          <button @click="$router.push('/')" class="btn-nordic-ghost">
            Back to Welcome
          </button>
        </div>
      </div>
    </div>

    <!-- Provider Info -->
    <div class="mt-8 text-center text-xs text-nordic-text-muted max-w-md">
      <p>
        Need help? Visit the documentation for your selected provider to get API
        keys and setup instructions.
      </p>
    </div>
  </div>
</template>
