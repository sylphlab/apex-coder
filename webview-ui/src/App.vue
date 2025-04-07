<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter
import { vscode } from './vscode';
import { ProviderService } from './services/providerService';
// Removed import './app.css'; as UnoCSS handles styles now
// --- Configuration State ---
const providerSet = ref<boolean>(false);
const apiKeySet = ref<boolean>(false);
const isModelInitialized = ref<boolean>(false);
const configuredProvider = ref<string | null>(null);
const configuredModelId = ref<string | null>(null);
const configError = ref<string | null>(null);

// --- State passed down to views ---
// Setup Form State
const setupProvider = ref<string>('');
const setupModelId = ref<string>('');
const setupApiKey = ref<string>('');
const setupBaseUrl = ref<string>('');
const setupCustomModelId = ref<string>('');

// Provider & Model state
const providers = ref<any[]>([]);
const models = ref<any[]>([]);
// Load providers on mount
onMounted(async () => {
  try {
    providers.value = await ProviderService.getAllProviders();
  } catch (error) {
    console.error('Error loading providers in App.vue:', error);
  }
});

// Computed properties derived from setup state (needed by both App and SetupView)
const selectedProviderDetails = computed(() => {
  return providers.value.find(p => p.id === setupProvider.value);
});

// Watch for provider changes to load models
watch(setupProvider, async (newProvider) => {
  // Reset model selection
  setupModelId.value = '';
  setupCustomModelId.value = '';
  
  if (!newProvider) {
    models.value = [];
    return;
  }
  
  try {
    models.value = await ProviderService.getModelsForProvider(newProvider);
  } catch (error) {
    console.error(`Error loading models for provider ${newProvider}:`, error);
    models.value = [];
  }
});

const availableModels = computed(() => {
  return models.value;
});

// --- Chat State (remains in App.vue as it's core application state) ---
interface CoreMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  error?: boolean;
}
const chatMessages = ref<CoreMessage[]>([]);
const currentInput = ref<string>('');
const isLoading = ref<boolean>(false);
const thinkingStepText = ref<string | null>(null); // State for thinking step

const isConfigComplete = computed(() => {
  if (!providerSet.value) return false; // Must have a provider selected

  const providerDetails = selectedProviderDetails.value; // Use the existing computed property

  // If the selected provider requires an API key, check if it's set
  if (providerDetails?.requiresApiKey) {
    return apiKeySet.value;
  }

  // If the provider does NOT require an API key (e.g., Ollama),
  // then configuration is complete just by having the provider set.
  return true;
});

let removeListener: (() => void) | null = null;
const router = useRouter(); // Get router instance

const getConfigStatus = () => {
  console.log('Requesting config status...');
  vscode.postMessage({ command: 'getConfigStatus' });
};

const saveConfiguration = () => {
  configError.value = null;
  const provider = setupProvider.value;
  // Use custom model ID if entered and provider allows it, otherwise use dropdown selection
  const modelId = selectedProviderDetails.value?.allowCustomModel && setupCustomModelId.value.trim()
                  ? setupCustomModelId.value.trim()
                  : setupModelId.value;

  const payload = {
    provider: provider,
    modelId: modelId || null, // Send null if empty/not selected
    apiKey: setupApiKey.value.trim(),
    baseUrl: setupBaseUrl.value.trim() || null,
  };

  if (!payload.provider) {
    configError.value = 'Please select a Provider.';
    return;
  }
  // Model ID is often optional (defaults on backend/provider side), so don't validate here strictly unless needed.
  // API key validation (only if provider requires it)
  if (selectedProviderDetails.value?.requiresApiKey && !payload.apiKey) {
     configError.value = `API Key is required for ${selectedProviderDetails.value.name}.`;
     return;
   }
   // Base URL validation (only if provider requires it - primarily Ollama)
   if (selectedProviderDetails.value?.requiresBaseUrl && !payload.baseUrl) {
       // Make Base URL optional for Ollama for now, user might run on default localhost
       // configError.value = `Base URL is required for ${selectedProviderDetails.value.name}.`;
       // return;
   }


  console.log('Sending saveConfiguration message:', payload);
  vscode.postMessage({ command: 'saveConfiguration', payload });
};

const sendChatMessage = async () => {
  console.log('[sendChatMessage] Attempting to send:', {
    input: currentInput.value.trim(),
    isLoading: isLoading.value,
    isConfigComplete: isConfigComplete.value,
    isModelInitialized: isModelInitialized.value // Log this crucial state
  });
  if (!currentInput.value.trim() || isLoading.value || !isConfigComplete.value || !isModelInitialized.value) { // Added !isModelInitialized check here explicitly for logging clarity, though it's covered by :disabled
      console.warn('[sendChatMessage] Aborted due to conditions.');
      return;
  }

  const userMessageContent = currentInput.value;
  const messageId = `msg-${Date.now()}`;

  chatMessages.value.push({ role: 'user', content: userMessageContent, id: messageId });
  currentInput.value = '';
  isLoading.value = true;

  // chatMessages.value.push({ role: 'assistant', content: '', id: messageId }); // REMOVED: Don't add empty bubble immediately
  await nextTick();
  // scrollToBottom(); // Removed: Scrolling is handled within ChatView now

  console.log('[sendChatMessage] Conditions met. Posting message to extension:', { id: messageId, text: userMessageContent });
  vscode.postMessage({
    command: 'sendMessage',
    payload: { id: messageId, text: userMessageContent }
  });
  console.log('[sendChatMessage] Message posted.');
};

const handleExtensionMessage = (event: MessageEvent<any>) => {
  const message = event.data;
  console.log('Received message from extension:', message);

  if (typeof message !== 'object' || message === null || !message.command) {
    console.warn('Received malformed message:', message);
    return;
  }

  switch (message.command) {
    case 'aiThinkingStep': // Handle new message type
      thinkingStepText.value = message.payload?.text ?? null;
      isLoading.value = true; // Ensure loading is true when thinking starts
      break;
    case 'configStatus':
    case 'configSaved': // Treat saved same as status update for UI
      console.log('Handling configStatus/configSaved:', message.payload);
      providerSet.value = message.payload?.providerSet ?? false;
      // API key logic remains similar, backend determines if it's truly needed (like for Ollama)
      apiKeySet.value = providerSet.value && (message.payload?.apiKeySet ?? false);
      isModelInitialized.value = message.payload?.isModelInitialized ?? false;
      configuredProvider.value = message.payload?.provider ?? null;
      configuredModelId.value = message.payload?.modelId ?? null;

      if (message.command === 'configSaved' && isConfigComplete.value) {
          // Don't clear setup form immediately, user might want to see what was saved
          // setupProvider.value = '';
          // setupModelId.value = '';
          // setupApiKey.value = '';
          // setupBaseUrl.value = '';
          configError.value = null; // Clear error on successful save
      }
      if (message.command === 'configSaved' && !isModelInitialized.value) {
          configError.value = `Configuration saved, but failed to initialize model for ${configuredProvider.value || 'selected provider'}. Check model ID, API key, or connection.`;
      }
      break;
case 'configError':
  console.error('Configuration error from extension:', message.payload);
  configError.value = message.payload || 'Unknown error saving configuration.';
  break;

case 'toolResult': // Handle message indicating tool execution result
console.log('Tool execution result:', message.payload);
// Optional: Display a temporary message/toast in the UI about the tool result
// For now, just log it. We could add a dedicated status area later.
// Example: Append a system message to chat?
// chatMessages.value.push({
// 	role: 'system', // Or 'assistant' with special formatting
// 	content: `Tool '${message.payload.toolName}' executed. Success: ${message.payload.success}. Message: ${message.payload.message}`,
// 	id: `tool-${Date.now()}`
// });
// scrollToBottom(); // If adding to chat
break;


    case 'aiResponseChunk':
      const chunkPayload = message.payload;
      if (chunkPayload && chunkPayload.id) {
        // Ensure loading state stays true and thinking text persists during streaming
        isLoading.value = true;
        let msgIndex = chatMessages.value.findIndex(m => m.role === 'assistant' && m.id === chunkPayload.id);

        // If assistant message doesn't exist yet, create it
        if (msgIndex === -1) {
            chatMessages.value.push({
                role: 'assistant',
                content: '',
                id: chunkPayload.id
            });
            // Find the index of the newly added message
            msgIndex = chatMessages.value.length - 1;
             // Optional: Clear generic "Thinking..." text now that response starts
             if (thinkingStepText.value === 'Thinking...') {
               thinkingStepText.value = null; // Or set "Receiving response..."
             }
        }

        // Append chunk to the (now guaranteed existing) message
        if (msgIndex !== -1) {
             chatMessages.value[msgIndex].content += chunkPayload.text || '';
        } else {
            // Should not happen with the logic above, but log if it does
            console.error(`Could not find or create assistant message with id ${chunkPayload.id}`);
        }
      }
      break;

    case 'aiResponseComplete':
      const completePayload = message.payload;
      if (completePayload && completePayload.id) {
        console.log(`Stream ${completePayload.id} finished.`);
         // const msgIndex = chatMessages.value.findIndex(m => m.id === completePayload.id); // Removed unused variable
         // No specific action needed on complete for now, just stop loading
        isLoading.value = false;
        // scrollToBottom(); // Removed: Handled in ChatView
      }
      break;

    case 'error':
      console.error('Error message from extension:', message.payload);
      chatMessages.value.push({
          role: 'assistant',
          content: `**Error:** ${message.payload || 'Unknown error occurred.'}`,
          id: `err-${Date.now()}`,
          error: true
      });
      isLoading.value = false;
      thinkingStepText.value = null; // Clear thinking text on error
      thinkingStepText.value = null; // Clear thinking text on complete
      // scrollToBottom(); // Removed: Handled in ChatView
      break;

    default:
      console.warn('Received unknown command from extension:', message.command);
  }
};

// Removed chatContainerRef and scrollToBottom function, as scrolling is handled within ChatView

onMounted(async () => { // Make async to await initial navigation
  removeListener = vscode.onMessage(handleExtensionMessage);
  
  // Load providers
  try {
    providers.value = await ProviderService.getAllProviders();
  } catch (error) {
    console.error('Error loading providers in App.vue:', error);
  }
  
  // Request status first, then navigate based on the initial response
  // The handleExtensionMessage function will trigger the initial navigation
  getConfigStatus();
});

onUnmounted(() => {
  if (removeListener) {
    removeListener();
  }
});

</script>

<template>
  <!-- Main container with Nordic theme -->
  <div class="h-screen flex flex-col overflow-hidden"
       style="background-color: var(--vscode-sideBar-background, white);
              color: var(--vscode-foreground, black);
              font-family: var(--vscode-font-family, sans-serif);">
    
    <!-- Router View will render Welcome, Setup, or Chat views -->
    <router-view
      :setup-provider="setupProvider"
      :setup-model-id="setupModelId"
      :setup-api-key="setupApiKey"
      :setup-base-url="setupBaseUrl"
      :setup-custom-model-id="setupCustomModelId"
      :config-error="configError"
      :selected-provider-details="selectedProviderDetails"
      :available-models="availableModels"
      @update:setupProvider="setupProvider = $event"
      @update:setupModelId="setupModelId = $event"
      @update:setupApiKey="setupApiKey = $event"
      @update:setupBaseUrl="setupBaseUrl = $event"
      @update:setupCustomModelId="setupCustomModelId = $event"
      @save-configuration="saveConfiguration"

      :chat-messages="chatMessages"
      :current-input="currentInput"
      :is-loading="isLoading"
      :is-model-initialized="isModelInitialized"
      :configured-provider="configuredProvider"
      :configured-model-id="configuredModelId"
      :thinking-step-text="thinkingStepText"
      @update:currentInput="currentInput = $event"
      @send-chat-message="sendChatMessage"
      @get-config-status="getConfigStatus"
      @change-settings="providerSet = false; apiKeySet = false; isModelInitialized = false; router.push('/setup')"
    ></router-view>
  </div>
</template>