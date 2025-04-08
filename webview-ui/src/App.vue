<script setup lang="ts">
// Restore necessary imports
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useConfigStore } from './stores/configStore';
import { vscode } from './vscode';

console.log('App.vue script setup executing (with store/router)...');

// Restore Store Logic
const configStore = useConfigStore();
const {
  isModelInitialized,
  isConfigComplete // Add other needed refs back later
} = storeToRefs(configStore);

// Restore Router Logic
const router = useRouter();

// Restore Basic Message Handling State (keep it simple for now)
interface CoreMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  error?: boolean;
}
const chatMessages = ref<CoreMessage[]>([]); // Keep state, maybe pass to views later
const currentInput = ref<string>(''); // Keep state
const isLoading = ref<boolean>(false); // Keep state
const thinkingStepText = ref<string | null>(null); // Keep state

// Basic Message Listener Logic (restore full logic later)
let removeListener: (() => void) | null = null;
const handleExtensionMessage = (event: MessageEvent<any>) => {
  const message = event.data;
  console.log('Received message from extension:', message);
   if (typeof message !== 'object' || message === null || !message.command) return;

   // Restore handling for basic commands needed for routing/init
   switch (message.command) {
       case 'configStatus':
       case 'configSaved':
          configStore.updateConfigStatus({ ...message.payload, commandSource: message.command });
          break;
        // Add other handlers back later
   }

};

const getConfigStatus = () => {
  console.log('Requesting config status...');
  vscode.postMessage({ command: 'getConfigStatus' });
};

onMounted(() => {
  console.log('App.vue mounted (with router/store)');
  removeListener = vscode.onMessage(handleExtensionMessage);
  getConfigStatus(); // Request initial status
});

// Restore watcher for routing based on initialization
watch(isModelInitialized, (newValue, oldValue) => {
   // Prevent navigation on initial load if already true
   if (newValue === true && oldValue !== true) {
       console.log('Model initialized, navigating to /chat');
       router.push('/chat');
   } else if (newValue === false && oldValue === true) {
        // Handle case where model becomes uninitialized? Maybe route to setup?
        console.log('Model became uninitialized, navigating to /setup');
        router.push('/setup'); // Or welcome?
   }
}, { immediate: false }); // Don't run immediately, wait for first status update

onUnmounted(() => {
  if (removeListener) {
    removeListener();
  }
});

// Restore sendChatMessage or similar methods later as needed by views

</script>

<template>
  <!-- Main container - restore theme variables -->
  <div class="h-screen flex flex-col overflow-hidden"
       style="background-color: var(--vscode-sideBar-background, white);
              color: var(--vscode-foreground, black);
              font-family: var(--vscode-font-family, sans-serif);">

      <!-- Restore router-view -->
      <!-- Props/Events will be added back as components are restored -->
      <router-view
          :chat-messages="chatMessages"
          :current-input="currentInput"
          :is-loading="isLoading"
          :thinking-step-text="thinkingStepText"
          @update:currentInput="currentInput = $event"
          @get-config-status="getConfigStatus"
          @change-settings="configStore.$reset(); router.push('/setup')"
        ></router-view>

  </div>
</template>

<style scoped>
/* Keep styles empty or minimal for now */
</style>