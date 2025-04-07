<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'; // Added watch
import { vscode } from './vscode';

// --- Configuration State ---
const providerSet = ref<boolean>(false);
const apiKeySet = ref<boolean>(false);
const isModelInitialized = ref<boolean>(false);
const configuredProvider = ref<string | null>(null);
const configuredModelId = ref<string | null>(null);
const configError = ref<string | null>(null);

// --- Setup Form State ---
const setupProvider = ref<string>(''); // Now bound to select
const setupModelId = ref<string>(''); // Now bound to select or input
const setupApiKey = ref<string>('');
const setupBaseUrl = ref<string>('');
const setupCustomModelId = ref<string>(''); // For custom Ollama models etc.

// --- Provider & Model Options ---
const providerOptions = ref([
  {
    value: '', label: '-- Select Provider --', models: [], requiresApiKey: false, requiresBaseUrl: false, allowCustomModel: false,
  },
  {
    value: 'googleai',
    label: 'Google AI (Gemini)',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'models/gemini-1.5-flash', label: 'Gemini 1.5 Flash' }, // Use standard name first
      { value: 'models/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'models/gemini-1.5-flash-exp', label: 'Gemini 1.5 Flash (Exp)' }, // Added Exp
      { value: 'models/gemini-1.5-pro-exp-03-25', label: 'Gemini 1.5 Pro (Exp 03-25)' }, // Added Exp
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    allowCustomModel: false, // Google usually requires specific model names
  },
  {
    value: 'openai',
    label: 'OpenAI (GPT)',
    models: [
      { value: '', label: '-- Select Model --' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    allowCustomModel: false,
  },
  {
    value: 'anthropic',
    label: 'Anthropic (Claude)',
     models: [
      { value: '', label: '-- Select Model --' },
      { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    requiresApiKey: true,
    requiresBaseUrl: false,
    allowCustomModel: false,
  },
  {
    value: 'ollama',
    label: 'Ollama (Local)',
    models: [
       { value: '', label: '-- Select Common Model (or enter custom below) --' },
       { value: 'llama3', label: 'Llama 3 (Default)' },
       { value: 'mistral', label: 'Mistral (Default)' },
       { value: 'codellama', label: 'Code Llama (Default)' },
       // Add other common Ollama models if desired
    ],
    requiresApiKey: false, // Ollama doesn't use API keys
    requiresBaseUrl: true, // Ollama usually needs a Base URL
    allowCustomModel: true, // Allow user to specify other local models
  },
]);

const selectedProviderDetails = computed(() => {
  return providerOptions.value.find(p => p.value === setupProvider.value);
});

const availableModels = computed(() => {
  return selectedProviderDetails.value?.models || [];
});

// Watcher to reset model selection when provider changes
watch(setupProvider, () => {
  setupModelId.value = ''; // Reset dropdown selection
  setupCustomModelId.value = ''; // Reset custom input
});


// --- Chat State ---
interface CoreMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  error?: boolean;
}
const chatMessages = ref<CoreMessage[]>([]);
const currentInput = ref<string>('');
const isLoading = ref<boolean>(false);

const isConfigComplete = computed(() => providerSet.value && apiKeySet.value); // Keep apiKeySet logic for simplicity, backend handles Ollama case

let removeListener: (() => void) | null = null;

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
  if (!currentInput.value.trim() || isLoading.value || !isConfigComplete.value) return;

  const userMessageContent = currentInput.value;
  const messageId = `msg-${Date.now()}`;

  chatMessages.value.push({ role: 'user', content: userMessageContent, id: messageId });
  currentInput.value = '';
  isLoading.value = true;

  chatMessages.value.push({ role: 'assistant', content: '', id: messageId });
  await nextTick();
  scrollToBottom();

  console.log('Sending sendMessage to extension:', userMessageContent);
  vscode.postMessage({
    command: 'sendMessage',
    payload: { id: messageId, text: userMessageContent }
  });
};

const handleExtensionMessage = (event: MessageEvent<any>) => {
  const message = event.data;
  console.log('Received message from extension:', message);

  if (typeof message !== 'object' || message === null || !message.command) {
    console.warn('Received malformed message:', message);
    return;
  }

  switch (message.command) {
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

    case 'aiResponseChunk':
      const chunkPayload = message.payload;
      if (chunkPayload && chunkPayload.id) {
        const msgIndex = chatMessages.value.findIndex(m => m.role === 'assistant' && m.id === chunkPayload.id);
        if (msgIndex !== -1) {
          chatMessages.value[msgIndex].content += chunkPayload.text || '';
          scrollToBottom();
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
        scrollToBottom();
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
      scrollToBottom();
      break;

    default:
      console.warn('Received unknown command from extension:', message.command);
  }
};

const chatContainer = ref<HTMLElement | null>(null);
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

onMounted(() => {
  removeListener = vscode.onMessage(handleExtensionMessage);
  getConfigStatus();
});

onUnmounted(() => {
  if (removeListener) {
    removeListener();
  }
});

</script>

<template>
  <div class="container">
    <h1>Apex Coder</h1>

    <!-- Setup Form (v-if not configured) -->
    <div v-if="!isConfigComplete" class="setup-form">
      <h2>Setup AI Provider</h2>
      <p>Please configure your AI provider to start using Apex Coder.</p>

      <!-- Provider Dropdown -->
      <div class="form-group">
        <label for="provider-select">Provider:</label>
        <select id="provider-select" v-model="setupProvider">
          <option v-for="option in providerOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Model Dropdown (conditional) -->
      <div class="form-group" v-if="setupProvider && availableModels.length > 0">
        <label for="modelId-select">Model:</label>
        <select id="modelId-select" v-model="setupModelId">
           <option v-for="model in availableModels" :key="model.value" :value="model.value">
             {{ model.label }}
           </option>
        </select>
      </div>

      <!-- Custom Model ID Input (conditional, e.g., for Ollama) -->
       <div class="form-group" v-if="selectedProviderDetails?.allowCustomModel">
         <label for="customModelId">Custom Model ID (if not in list):</label>
         <input type="text" id="customModelId" v-model="setupCustomModelId" placeholder="e.g., my-local-model:latest">
       </div>

       <!-- API Key Input (conditional) -->
       <div class="form-group" v-if="selectedProviderDetails?.requiresApiKey">
         <label for="apiKey">API Key:</label>
         <input type="password" id="apiKey" v-model="setupApiKey" placeholder="Enter your API Key">
       </div>

       <!-- Base URL Input (conditional) -->
       <div class="form-group" v-if="selectedProviderDetails?.requiresBaseUrl">
         <label for="baseUrl">Base URL (Optional for Ollama):</label>
         <input type="text" id="baseUrl" v-model="setupBaseUrl" placeholder="e.g., http://localhost:11434">
       </div>

       <!-- Error Message -->
       <div v-if="configError" class="error-message">
           Error: {{ configError }}
       </div>

      <button @click="saveConfiguration">Save Configuration</button>
       <hr>
       <p>Current Status: Provider Set? {{ providerSet }}, API Key Set? {{ apiKeySet }}, Model Initialized? {{ isModelInitialized }}</p>
       <button @click="getConfigStatus">Refresh Status</button>
    </div>

    <!-- Chat Interface (v-if configured) -->
    <div v-else class="chat-app">
       <p>
           Provider: <strong>{{ configuredProvider }}</strong> |
           Model: <strong>{{ configuredModelId || 'default' }}</strong> |
           Initialized: <strong :class="{ 'status-ok': isModelInitialized, 'status-error': !isModelInitialized }">{{ isModelInitialized ? 'Yes' : 'No' }}</strong>
           <button @click="getConfigStatus" :disabled="isLoading">Refresh Status</button>
           <button @click="providerSet = false; apiKeySet = false; isModelInitialized = false;">Change Settings</button> <!-- Reset status when changing -->
       </p>
       <hr>
       <div class="chat-messages" ref="chatContainer">
         <div v-for="(msg) in chatMessages" :key="msg.id || Math.random()" :class="['message', msg.role, { error: msg.error }]">
           <span class="role">{{ msg.role }}</span>
           <pre class="content">{{ msg.content }}</pre>
         </div>
         <div v-if="isLoading" class="message assistant loading-placeholder">
           <span class="role">assistant</span>
           <span class="content loading">▍</span>
         </div>
       </div>

       <div class="chat-input">
         <textarea
           v-model="currentInput"
           placeholder="Enter your message..."
           @keydown.enter.prevent="sendChatMessage"
           :disabled="isLoading || !isModelInitialized"
         ></textarea>
         <button @click="sendChatMessage" :disabled="isLoading || !currentInput.trim() || !isModelInitialized">
           {{ isLoading ? 'Thinking...' : 'Send' }}
         </button>
       </div>
    </div>

  </div>
</template>

<style scoped>
.container {
  padding: 15px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: var(--vscode-sideBar-background); /* Match sidebar */
  color: var(--vscode-foreground);
}

h1 {
  color: var(--vscode-editor-foreground);
  text-align: center;
  margin-top: 0;
}
h2 {
    margin-top: 0;
    color: var(--vscode-editor-foreground);
}

hr {
    border: none;
    border-top: 1px solid var(--vscode-editorWidget-border);
    margin: 15px 0;
}

/* --- Setup Form --- */
.setup-form {
  /* background-color: var(--vscode-sideBar-background); */
  padding: 20px;
  border-radius: 5px;
  /* border: 1px solid var(--vscode-sideBar-border, transparent); */
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  color: var(--vscode-foreground);
  font-size: 0.9em;
}
.form-group input[type="text"],
.form-group input[type="password"],
.form-group select /* Style select elements */
 {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--vscode-input-border);
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border-radius: 3px;
  box-sizing: border-box;
}
/* Add focus styles */
.form-group input[type="text"]:focus,
.form-group input[type="password"]:focus,
.form-group select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
}

.error-message {
    color: var(--vscode-errorForeground);
    margin-top: 10px;
    margin-bottom: 10px;
    padding: 8px;
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--vscode-errorForeground);
    border-radius: 3px;
}


/* --- Chat App --- */
.chat-app {
  display: flex;
  flex-direction: column;
  height: 100%; /* Take remaining height */
  flex-grow: 1; /* Allow chat app to grow */
  overflow: hidden; /* Prevent container overflow */
}
.chat-app p { /* Style status paragraph */
    font-size: 0.9em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
}
.chat-app p strong {
    color: var(--vscode-foreground);
}
.chat-app p button {
    margin-left: 10px;
    padding: 2px 8px;
    font-size: 0.85em;
}
.status-ok {
    color: var(--vscode-terminal-ansiGreen); /* Use VS Code theme color */
}
.status-error {
    color: var(--vscode-errorForeground); /* Use VS Code theme color */
}


.chat-messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-editorWidget-border);
  border-radius: 4px;
  margin-bottom: 10px;
}

.message {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  max-width: 85%;
  word-wrap: break-word;
}

.message .role {
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
  font-size: 0.9em;
  text-transform: capitalize;
  color: var(--vscode-textLink-foreground);
}

.message.user {
  background-color: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  margin-left: auto; /* Align user messages to the right */
  text-align: right;
}
.message.user .role {
    color: var(--vscode-list-activeSelectionForeground); /* Adjust role color for user */
}


.message.assistant {
  background-color: var(--vscode-sideBar-background);
  color: var(--vscode-sideBar-foreground);
  margin-right: auto; /* Align assistant messages to the left */
  text-align: left;
}
.message.assistant.error {
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--vscode-errorForeground);
    color: var(--vscode-errorForeground);
}
.message.assistant.error .role {
    color: var(--vscode-errorForeground);
}


.message .content {
  white-space: pre-wrap; /* Preserve whitespace and wrap */
}
.loading-placeholder .content.loading {
    display: inline-block;
    animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}


.chat-input {
  display: flex;
  margin-top: 10px;
  border-top: 1px solid var(--vscode-editorWidget-border);
  padding-top: 10px;
}

.chat-input textarea {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  margin-right: 10px;
  resize: none; /* Prevent manual resizing */
  min-height: 40px; /* Minimum height */
  max-height: 150px; /* Maximum height before scrolling */
  overflow-y: auto; /* Allow scrolling within textarea */
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
}
.chat-input textarea:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
}

button {
  padding: 10px 15px;
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover {
  background-color: var(--vscode-button-hoverBackground);
}
button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>