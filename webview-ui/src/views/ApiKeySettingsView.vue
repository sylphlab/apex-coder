<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ProviderService, type ProviderDetails } from '../services/providerService';

// Define props received from App.vue - we don't need providerOptions anymore
const props = defineProps<{
  configuredProvider: string | null;
  configuredModelId: string | null;
  isModelInitialized: boolean;
}>();

// Define emits to send updates back to App.vue
const emit = defineEmits([
  'getConfigStatus',
  'changeSettings',
]);

const router = useRouter();

// Search functionality
const searchQuery = ref('');

// Loading state
const isLoading = ref(true);
const loadingError = ref<string | null>(null);

// Providers state
const providers = ref<ProviderDetails[]>([]);

// Fetch providers on mount
onMounted(async () => {
  try {
    isLoading.value = true;
    loadingError.value = null;
    providers.value = await ProviderService.getAllProviders();
    isLoading.value = false;
  } catch (error) {
    isLoading.value = false;
    loadingError.value = error instanceof Error ? error.message : 'Failed to load providers';
    console.error('Error loading providers:', error);
  }
});

// Filtered providers based on search
const filteredProviders = computed(() => {
  if (!searchQuery.value.trim()) {
    return providers.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return providers.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.id.toLowerCase().includes(query)
  );
});

// Check if a provider is configured and working
const isProviderConfigured = (providerId: string) => {
  return props.configuredProvider === providerId && props.isModelInitialized;
};

// Check if a provider is configured but not working
const isProviderError = (providerId: string) => {
  return props.configuredProvider === providerId && !props.isModelInitialized;
};

// Navigate to setup page for a specific provider
const configureProvider = (providerId: string) => {
  router.push({
    path: '/setup',
    query: { provider: providerId }
  });
};

// Refresh status
const refreshStatus = async () => {
  emit('getConfigStatus');
  
  // Also refresh providers list
  try {
    isLoading.value = true;
    loadingError.value = null;
    // Clear cache to force refresh
    ProviderService.clearCache();
    providers.value = await ProviderService.getAllProviders();
    isLoading.value = false;
  } catch (error) {
    isLoading.value = false;
    loadingError.value = error instanceof Error ? error.message : 'Failed to refresh providers';
    console.error('Error refreshing providers:', error);
  }
};

// Animation states
const isLoaded = ref(false);

// Set isLoaded to true after a short delay to trigger animations
onMounted(() => {
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);
});
</script>

<template>
  <div class="flex flex-col h-full animate-nordic-fade-in">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-nordic-bg-light">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-light text-nordic-text-primary">API Key Settings</h1>
        <div class="flex space-x-2">
          <button 
            @click="refreshStatus" 
            class="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            Refresh
          </button>
          <button 
            @click="router.push('/')" 
            class="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Back
          </button>
        </div>
      </div>
      
      <!-- Search bar -->
      <div class="mt-4 relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search providers..."
          class="input-nordic pl-10"
        >
      </div>
    </div>
    
    <!-- Provider list with status indicators -->
    <div
      class="flex-grow overflow-y-auto p-6 custom-scrollbar"
      :class="{ 'translate-y-0 opacity-100': isLoaded, 'translate-y-4 opacity-0': !isLoaded }"
      style="transition-delay: 100ms; transition-duration: 500ms;"
    >
      <!-- Loading state -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center h-full text-nordic-text-muted">
        <div class="w-16 h-16 mb-4 rounded-full bg-nordic-bg-light flex items-center justify-center animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-sm mb-2">Loading providers...</p>
      </div>
      
      <!-- Error state -->
      <div v-else-if="loadingError" class="flex flex-col items-center justify-center h-full text-nordic-text-muted">
        <div class="w-16 h-16 mb-4 rounded-full bg-nordic-error bg-opacity-10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-nordic-error" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-sm mb-2 text-nordic-error">Error loading providers</p>
        <p class="text-xs max-w-md text-center">{{ loadingError }}</p>
        <button
          @click="refreshStatus"
          class="btn-nordic-primary text-xs px-3 py-2 mt-4"
        >
          Try Again
        </button>
      </div>
      
      <!-- Empty state when search has no results -->
      <div v-else-if="filteredProviders.length === 0" class="flex flex-col items-center justify-center h-full text-nordic-text-muted">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-4 text-nordic-text-muted opacity-50" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        <p class="text-sm mb-2">No providers found</p>
        <p class="text-xs max-w-md text-center">Try a different search term</p>
      </div>
      
      <!-- Provider List -->
      <template v-else>
        <!-- Removed grouping headers and loops -->
        <div class="mb-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="provider in filteredProviders"
              :key="provider.id"
              class="card-nordic flex items-center justify-between p-4 hover:shadow-nordic-md"
            >
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-nordic-bg-light flex items-center justify-center mr-3">
                  <span class="text-sm font-medium text-nordic-primary">{{ provider.name.charAt(0) }}</span>
                </div>
                <div>
                  <h3 class="text-sm font-medium text-nordic-text-primary">{{ provider.name }}</h3>
                  <p class="text-xs text-nordic-text-muted">{{ provider.id }}</p>
                </div>
              </div>
              <div class="flex items-center">
                <!-- Status indicator -->
                <div v-if="isProviderConfigured(provider.id)" class="mr-3 w-6 h-6 rounded-full bg-nordic-success bg-opacity-20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-nordic-success" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div v-else-if="isProviderError(provider.id)" class="mr-3 w-6 h-6 rounded-full bg-nordic-error bg-opacity-20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-nordic-error" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div v-else class="mr-3 w-6 h-6 rounded-full bg-nordic-bg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                  </svg>
                </div>
                <!-- Configure button -->
                <button
                  @click="configureProvider(provider.id)"
                  class="btn-nordic-ghost text-xs px-2.5 py-1.5"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <!-- Footer -->
    <div class="px-6 py-4 border-t border-nordic-bg-light">
      <div class="flex justify-between items-center">
        <p class="text-xs text-nordic-text-muted">
          {{ isLoading ? 'Loading...' : `${filteredProviders.length} providers available` }}
        </p>
        <button 
          @click="router.push('/setup')" 
          class="btn-nordic-primary text-xs px-3 py-2"
        >
          Add New Provider
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4));
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
}
</style>