<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'; // Removed watch
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia'; // Import storeToRefs
import { useConfigStore } from './stores/configStore'; // Import the store
import { vscode } from './vscode';
// Removed ProviderService import as it's used in the store now
// Removed import './app.css'; as UnoCSS handles styles now
// --- Use Pinia Store for Configuration ---
const configStore = useConfigStore();
// Use storeToRefs to keep reactivity for state properties used in the template or computed properties
const {
  providerSet,
  apiKeySet,
  isModelInitialized,
  configuredProvider,
  configuredModelId,
  // configError, // We'll use the store's error directly
  // setupProvider, // Use store state directly
  // setupModelId,
  // setupApiKey,
  // setupBaseUrl,
  // setupCustomModelId,
  // providers, // Use store state directly
  // models, // Use store state directly
  isConfigComplete // Use store computed directly
} = storeToRefs(configStore);

// --- Chat State (remains in App.vue for now) ---
// --- Chat State (remains in App.vue as it's core application state) ---
// Note: Provider/Model fetching and computed properties are now handled within the configStore
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

// isConfigComplete is now imported from the store using storeToRefs

let removeListener: (() => void) | null = null;
const router = useRouter(); // Get router instance

const getConfigStatus = () => {
  console.log('Requesting config status...');
  vscode.postMessage({ command: 'getConfigStatus' });
};

// saveConfiguration is now an action in the store
// const saveConfiguration = () => { ... }; // Removed local function

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
    case 'configStatus': // Received from extension
    case 'configSaved': // Received from extension after successful save
      console.log('Handling configStatus/configSaved:', message.payload);
      // Update the store state
      configStore.updateConfigStatus({ ...message.payload, commandSource: message.command });
      break;
    case 'configError': // Received from extension on save failure
      console.error('Configuration error from extension:', message.payload);
      configStore.setConfigError(message.payload || 'Unknown error saving configuration.');
      break; // Ensure break statement is present

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

    case 'providersResult': // Handle message containing provider list
      console.log('Handling providersResult:', message.payload);
      if (message.payload?.providers) {
        // Directly update the store's state ref
        configStore.providers = message.payload.providers;
      }
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

onMounted(() => {
  removeListener = vscode.onMessage(handleExtensionMessage);
  // Request initial config status when component mounts
  // The store handles provider fetching internally on initialization
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
    <!-- Router View will render Welcome, Setup, or Chat views -->
    <!-- Config-related props/emits are removed as views will use the store -->
    <router-view
      @save-configuration="configStore.saveConfiguration"
      :chat-messages="chatMessages"
      :current-input="currentInput"
      :is-loading="isLoading"
      :thinking-step-text="thinkingStepText"
      @update:currentInput="currentInput = $event"
      @send-chat-message="sendChatMessage"
      @get-config-status="getConfigStatus" 
      @change-settings="configStore.$reset(); router.push('/setup')"
    ></router-view>
  </div>
</template>