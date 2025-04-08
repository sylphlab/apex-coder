import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import {
  ProviderService,
  type ProviderDetails,
  type ModelInfo,
} from "../services/providerService.ts";
import { vscode } from "../vscode.ts"; // Re-added .ts extension

export const useConfigStore = defineStore("config", () => {
  // --- State ---
  const providers = ref<ProviderDetails[]>([]);
  const models = ref<ModelInfo[]>([]);
  const isLoadingProviders = ref(false);
  const isLoadingModels = ref(false);
  const loadingError = ref<string | null>(null);
  const configError = ref<string | null>(null);

  // Setup form state
  const setupProvider = ref<string>("");
  const setupModelId = ref<string>("");
  const setupApiKey = ref<string>("");
  const setupBaseUrl = ref<string>("");
  const setupCustomModelId = ref<string>("");

  // Configuration status from extension
  const providerSet = ref<boolean>(false);
  const apiKeySet = ref<boolean>(false);
  const isModelInitialized = ref<boolean>(false);
  const configuredProvider = ref<string | null>(null);
  const configuredModelId = ref<string | null>(null);

  // --- Computed ---
  const selectedProviderDetails = computed(() => {
    return providers.value.find((p) => p.id === setupProvider.value);
  });

  const isConfigComplete = computed(() => {
    if (!providerSet.value) return false;
    const providerDetails = providers.value.find(
      (p) => p.id === configuredProvider.value,
    ); // Check based on *configured* provider
    if (providerDetails?.requiresApiKey) {
      return apiKeySet.value;
    }
    return true; // If provider doesn't require API key, it's complete if set
  });

  // --- Actions ---
  async function fetchProviders() {
    try {
      isLoadingProviders.value = true;
      loadingError.value = null;
      providers.value = await ProviderService.getAllProviders();
    } catch (error) {
      loadingError.value =
        error instanceof Error ? error.message : "Failed to load providers";
      console.error(
        "[configStore] Error loading providers during initial fetch:",
        error,
      ); // More specific log
      providers.value = []; // Clear providers on error
    } finally {
      isLoadingProviders.value = false;
    }
  }

  async function fetchModelsForProvider(providerId: string) {
    if (!providerId) {
      models.value = [];
      return;
    }
    try {
      isLoadingModels.value = true;
      models.value = await ProviderService.getModelsForProvider(providerId);
      // Auto-select first model if none is selected
      if (models.value.length > 0 && !setupModelId.value) {
        setupModelId.value = models.value[0].id;
      }
    } catch (error) {
      console.error(`Error loading models for provider ${providerId}:`, error);
      models.value = []; // Clear models on error
    } finally {
      isLoadingModels.value = false;
    }
  }

  function saveConfiguration() {
    configError.value = null;
    const provider = setupProvider.value;
    const modelId =
      selectedProviderDetails.value?.allowCustomModel &&
      setupCustomModelId.value.trim()
        ? setupCustomModelId.value.trim()
        : setupModelId.value;

    const payload = {
      provider: provider,
      modelId: modelId || null,
      apiKey: setupApiKey.value.trim(),
      baseUrl: setupBaseUrl.value.trim() || null,
    };

    if (!payload.provider) {
      configError.value = "Please select a Provider.";
      return;
    }
    if (selectedProviderDetails.value?.requiresApiKey && !payload.apiKey) {
      configError.value = `API Key is required for ${selectedProviderDetails.value.name}.`;
      return;
    }
    // Base URL validation (optional for Ollama)
    // if (selectedProviderDetails.value?.requiresBaseUrl && !payload.baseUrl) {
    //   configError.value = `Base URL is required for ${selectedProviderDetails.value.name}.`;
    //   return;
    // }

    console.log("Sending saveConfiguration message via store:", payload);
    vscode.postMessage({ command: "saveConfiguration", payload });
  }

  function updateConfigStatus(payload: any) {
    console.log("Updating config status in store:", payload);
    providerSet.value = payload?.providerSet ?? false;
    apiKeySet.value = providerSet.value && (payload?.apiKeySet ?? false);
    isModelInitialized.value = payload?.isModelInitialized ?? false;
    configuredProvider.value = payload?.provider ?? null;
    configuredModelId.value = payload?.modelId ?? null;

    // If config was just saved successfully, clear local error
    if (payload?.commandSource === "configSaved" && isModelInitialized.value) {
      configError.value = null;
    }
    // If config saved but model failed to init, set error
    if (payload?.commandSource === "configSaved" && !isModelInitialized.value) {
      configError.value = `Configuration saved, but failed to initialize model for ${configuredProvider.value || "selected provider"}. Check model ID, API key, or connection.`;
    }
  }

  function setConfigError(errorMessage: string | null) {
    configError.value = errorMessage;
  }

  // --- Watchers ---
  // Watch for changes in the selected provider and fetch models accordingly
  watch(setupProvider, (newProviderId) => {
    // Reset model selection when provider changes
    setupModelId.value = "";
    setupCustomModelId.value = "";
    fetchModelsForProvider(newProviderId);
  });

  // --- Initial Fetch ---
  // Fetch providers when the store is initialized
  fetchProviders();

  return {
    // State
    providers,
    models,
    isLoadingProviders,
    isLoadingModels,
    loadingError,
    configError,
    setupProvider,
    setupModelId,
    setupApiKey,
    setupBaseUrl,
    setupCustomModelId,
    providerSet,
    apiKeySet,
    isModelInitialized,
    configuredProvider,
    configuredModelId,
    // Computed
    selectedProviderDetails,
    isConfigComplete,
    // Actions
    fetchProviders,
    fetchModelsForProvider,
    saveConfiguration,
    updateConfigStatus,
    setConfigError,
  };
});
