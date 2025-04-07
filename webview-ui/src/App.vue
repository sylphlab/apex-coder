rol<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router'; // Import useRouter
import { vscode } from './vscode';
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

// Provider & Model Options (remains in App.vue as it's shared config data)
const providerOptions = ref([
  { value: '', label: '-- Select Provider --', models: [], requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false },
  
  // Core providers
  {
    value: 'googleai', label: 'Google AI (Gemini)',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'models/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'models/gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'models/gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
      { value: 'models/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'models/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
      { value: 'models/gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro (Preview 03-25)' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'openai', label: 'OpenAI (GPT)',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'anthropic', label: 'Anthropic (Claude)',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'ollama', label: 'Ollama (Local)',
    models: [
      { value: '', label: '-- Select Common Model (or enter custom below) --' },
      { value: 'llama3', label: 'Llama 3' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'phi3', label: 'Phi-3' },
    ],
    requiresApiKey: false, requiresBaseUrl: true, allowCustomModel: true,
  },
  {
    value: 'deepseek', label: 'DeepSeek',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-coder', label: 'DeepSeek Coder' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  
  // Cloud providers
  {
    value: 'vertexai', label: 'Google Vertex AI',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'cohere', label: 'Cohere',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'command', label: 'Command' },
      { value: 'command-r', label: 'Command-R' },
      { value: 'command-r-plus', label: 'Command-R+' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'mistral', label: 'Mistral AI',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'mistral-large-latest', label: 'Mistral Large' },
      { value: 'mistral-medium-latest', label: 'Mistral Medium' },
      { value: 'mistral-small-latest', label: 'Mistral Small' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'perplexity', label: 'Perplexity AI',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'sonar-medium-online', label: 'Sonar Medium (Online)' },
      { value: 'sonar-small-online', label: 'Sonar Small (Online)' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'replicate', label: 'Replicate',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'meta/llama-3-70b-instruct', label: 'Llama 3 70B Instruct' },
      { value: 'meta/llama-3-8b-instruct', label: 'Llama 3 8B Instruct' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: true,
  },
  
  // Enterprise providers
  {
    value: 'aws', label: 'AWS Bedrock',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'anthropic.claude-3-sonnet-20240229-v1:0', label: 'Claude 3 Sonnet' },
      { value: 'anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'azure', label: 'Azure OpenAI',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' },
    ],
    requiresApiKey: true, requiresBaseUrl: true, allowCustomModel: false,
  },
  {
    value: 'groq', label: 'Groq',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'llama3-70b-8192', label: 'Llama 3 70B' },
      { value: 'llama3-8b-8192', label: 'Llama 3 8B' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
    requiresApiKey: true, requiresBaseUrl: false, allowCustomModel: false,
  },
]);

// Computed properties derived from setup state (needed by both App and SetupView)
const selectedProviderDetails = computed(() => {
  return providerOptions.value.find(p => p.value === setupProvider.value);
});
const availableModels = computed(() => {
  return selectedProviderDetails.value?.models || [];
});

// Watcher remains in App.vue as it modifies setup state held here
watch(setupProvider, () => {
  setupModelId.value = '';
  setupCustomModelId.value = '';
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
     configError.value = `API Key is required for ${selectedProviderDetails.value.label}.`;
     return;
   }
   // Base URL validation (only if provider requires it - primarily Ollama)
   if (selectedProviderDetails.value?.requiresBaseUrl && !payload.baseUrl) {
       // Make Base URL optional for Ollama for now, user might run on default localhost
       // configError.value = `Base URL is required for ${selectedProviderDetails.value.label}.`;
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
      :provider-options="providerOptions"
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