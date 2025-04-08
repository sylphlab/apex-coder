<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'; // Removed defineProps, defineEmits
import { storeToRefs } from 'pinia';
import { useConfigStore } from '../stores/configStore';
import { gsap } from 'gsap';

// Define props received from App.vue
const props = defineProps<{
  chatMessages: Array<any>; // Keep chat related props
  currentInput: string;
  isLoading: boolean;
  thinkingStepText: string | null;
  // Removed config-related props: isModelInitialized, configuredProvider, configuredModelId
}>();

// Use the config store to get config state
const configStore = useConfigStore();
const {
  isModelInitialized,
  configuredProvider,
  configuredModelId
} = storeToRefs(configStore);

// Define emits to send updates back to App.vue
const emit = defineEmits([
  'update:currentInput',
  'sendChatMessage',
  'getConfigStatus',
  'changeSettings',
]);

const chatContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isTextareaFocused = ref(false);

// Method to handle sending message
const handleSend = () => {
  if (props.currentInput.trim() && isModelInitialized.value && !props.isLoading) { // Use store state ref
    emit('sendChatMessage');
  }
};

// Method to handle keydown
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
};

// Auto-resize textarea based on content
const autoResizeTextarea = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 150)}px`;
  }
};

// Scroll to bottom when messages update
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (chatContainer.value) {
      if (smooth) {
        chatContainer.value.scrollTo({
          top: chatContainer.value.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
      }
    }
  });
};

// Watch for changes in chatMessages to animate the last message
watch(() => props.chatMessages, (newMessages, oldMessages) => {
  if (newMessages.length > (oldMessages?.length ?? 0)) {
    nextTick(() => {
      // Add a small delay to ensure element is ready for animation
      setTimeout(() => {
        const messageElements = chatContainer.value?.querySelectorAll('.chat-message');
        if (messageElements && messageElements.length > 0) {
          const lastMessageElement = messageElements[messageElements.length - 1] as HTMLElement;
          
          // Ensure initial state for animation is set
          lastMessageElement.style.opacity = '0';
          lastMessageElement.style.transform = 'translateY(15px)';
          
          gsap.fromTo(lastMessageElement,
            { opacity: 0, y: 15 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
              onComplete: () => {
                // Reset inline styles after animation completes
                gsap.set(lastMessageElement, { clearProps: "all" });
              }
            }
          );
        }
        scrollToBottom(true);
      }, 50);
    });
  } else {
    scrollToBottom();
  }
}, { deep: true });

// Watch for changes in currentInput to resize textarea
watch(() => props.currentInput, () => {
  autoResizeTextarea();
});

// Initial setup
onMounted(() => {
  scrollToBottom();
  autoResizeTextarea();
});

// Focus states
const handleFocus = () => {
  isTextareaFocused.value = true;
};

const handleBlur = () => {
  isTextareaFocused.value = false;
};
</script>

<template>
  <div class="flex flex-col flex-grow overflow-hidden animate-nordic-fade-in">
    <!-- Status Bar -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-nordic-bg-light">
      <div class="flex items-center space-x-4 text-nordic-text-secondary">
        <!-- Provider Badge -->
        <div class="flex items-center">
          <span class="text-xs mr-2">Provider:</span>
          <span class="px-2.5 py-1 bg-white rounded-lg text-xs font-medium shadow-nordic-sm">
            {{ configuredProvider || 'None' }} <!-- Use store state -->
          </span>
        </div>
        
        <!-- Model Badge -->
        <div class="flex items-center">
          <span class="text-xs mr-2">Model:</span>
          <span class="px-2.5 py-1 bg-white rounded-lg text-xs font-medium shadow-nordic-sm">
            {{ configuredModelId || 'default' }} <!-- Use store state -->
          </span>
        </div>
        
        <!-- Status Badge -->
        <div class="flex items-center">
          <span class="text-xs mr-2">Status:</span>
          <span
            class="flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
            :class="isModelInitialized ? 'bg-nordic-success bg-opacity-20 text-nordic-success' : 'bg-nordic-error bg-opacity-20 text-nordic-error'"
          >
            <span
              class="inline-block w-2 h-2 rounded-full mr-1.5"
              :class="isModelInitialized ? 'bg-nordic-success' : 'bg-nordic-error'"
            ></span>
            {{ isModelInitialized ? 'Ready' : 'Not Ready' }} <!-- Use store state -->
          </span>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex items-center space-x-2">
        <button
          @click="emit('getConfigStatus')"
          :disabled="props.isLoading"
          class="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
          :class="{ 'opacity-50 cursor-not-allowed': props.isLoading }"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          Refresh
        </button>
        <button
          @click="$router.push('/api-keys')"
          class="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v-1l1-1 1-1-1.243-.243A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd" />
          </svg>
          API Keys
        </button>
        <button
          @click="emit('changeSettings')"
          class="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
          Settings
        </button>
      </div>
    </div>

    <!-- Chat Message Area -->
    <div
      class="flex-grow overflow-y-auto px-6 py-4 custom-scrollbar"
      ref="chatContainer"
    >
      <!-- Empty State -->
      <div
        v-if="props.chatMessages.length === 0"
        class="h-full flex flex-col items-center justify-center text-nordic-text-muted"
      >
        <div class="w-16 h-16 mb-4 rounded-full bg-nordic-bg-light flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
          </svg>
        </div>
        <p class="text-sm mb-2">No messages yet</p>
        <p class="text-xs max-w-md text-center">Type a message below to start a conversation with the AI assistant</p>
      </div>
      
      <!-- Chat Messages -->
      <div v-else class="space-y-6">
        <div
          v-for="(msg, index) in props.chatMessages"
          :key="msg.id || index"
          class="chat-message transition-all duration-300"
        >
          <!-- User Message -->
          <div v-if="msg.role === 'user'" class="flex justify-end mb-2">
            <div class="max-w-[85%] px-4 py-3 rounded-xl shadow-nordic-sm bg-nordic-primary text-white">
              <div class="text-xs opacity-80 mb-1">You</div>
              <div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>
          
          <!-- Assistant Message -->
          <div v-else-if="msg.role === 'assistant'" class="flex justify-start mb-2">
            <div
              class="max-w-[85%] px-4 py-3 rounded-xl shadow-nordic-sm"
              :class="msg.error ? 'bg-nordic-error bg-opacity-10 text-nordic-error' : 'bg-white'"
            >
              <div class="text-xs text-nordic-text-muted mb-1">Assistant</div>
              <div class="text-sm whitespace-pre-wrap">{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Loading Indicator / Thinking Step -->
      <div
        v-if="props.isLoading"
        class="flex justify-start my-4"
      >
        <div class="max-w-[85%] px-4 py-3 rounded-xl bg-white bg-opacity-50 shadow-nordic-sm text-nordic-text-muted">
          <template v-if="props.thinkingStepText">
            <!-- Display thinking step text with a subtle indicator -->
            <div class="flex items-center">
              <div class="mr-2.5 flex space-x-1.5">
                <span class="block w-1.5 h-1.5 rounded-full bg-nordic-text-muted opacity-60 animate-nordic-pulse"></span>
                <span class="block w-1.5 h-1.5 rounded-full bg-nordic-text-muted opacity-60 animate-nordic-pulse" style="animation-delay: 0.2s"></span>
                <span class="block w-1.5 h-1.5 rounded-full bg-nordic-text-muted opacity-60 animate-nordic-pulse" style="animation-delay: 0.4s"></span>
              </div>
              <span class="text-sm whitespace-pre-wrap">{{ props.thinkingStepText }}</span>
            </div>
          </template>
          <template v-else>
            <!-- Improved dot animation -->
            <div class="flex items-center justify-center space-x-1.5">
              <span class="inline-block w-1.5 h-1.5 bg-nordic-text-muted rounded-full animate-bounce" style="animation-delay: 0s"></span>
              <span class="inline-block w-1.5 h-1.5 bg-nordic-text-muted rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
              <span class="inline-block w-1.5 h-1.5 bg-nordic-text-muted rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Chat Input Area -->
    <div class="px-6 py-4 border-t border-nordic-bg-light">
      <!-- Modern chat input container -->
      <div
        class="flex items-center p-2 bg-white rounded-xl transition-all duration-200"
        :class="{ 'shadow-nordic-md': isTextareaFocused }"
      >
        <!-- Text input area -->
        <div class="flex-grow relative mx-2">
          <textarea
            ref="textareaRef"
            :value="props.currentInput"
            @input="emit('update:currentInput', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Type a message..."
            @keydown="handleKeydown"
            @focus="handleFocus"
            @blur="handleBlur"
            :disabled="props.isLoading || !isModelInitialized"
            class="w-full py-2.5 px-3 resize-none min-h-[44px] max-h-[150px] overflow-y-auto text-sm transition-all duration-200 focus:outline-none bg-transparent rounded-lg custom-scrollbar"
            :class="{ 'opacity-60 cursor-not-allowed': props.isLoading || !isModelInitialized }"
          ></textarea>
          
          <!-- Disabled state overlay -->
          <!-- Disabled state overlay (uses store state) -->
          <div
            v-if="!isModelInitialized"
            class="absolute inset-0 flex items-center justify-center rounded-lg"
          >
            <div class="px-3 py-1 bg-nordic-error bg-opacity-10 text-nordic-error rounded-md text-xs font-medium">
              <span class="inline-block w-2 h-2 rounded-full bg-nordic-error mr-1.5"></span>
              Model not initialized
            </div>
          </div>
        </div>
        
        <!-- Send button -->
        <button
          @click="handleSend"
          :disabled="props.isLoading || !props.currentInput.trim() || !isModelInitialized"
          class="flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-200"
          :class="{
            'bg-nordic-primary text-white': !(props.isLoading || !props.currentInput.trim() || !isModelInitialized),
            'bg-nordic-bg-light text-nordic-text-muted': props.isLoading || !props.currentInput.trim() || !isModelInitialized,
            'hover:bg-opacity-90': !(props.isLoading || !props.currentInput.trim() || !isModelInitialized)
          }"
        >
          <template v-if="props.isLoading">
            <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </template>
          <template v-else>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </template>
        </button>
      </div>
      
      <!-- Text counter and hints -->
      <div class="flex justify-between items-center text-xs mt-2 px-2 text-nordic-text-muted">
        <div class="min-h-[1.2em]"> <!-- Add min-height to prevent layout shift -->
          <span v-if="!isModelInitialized" class="flex items-center">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-nordic-error mr-1.5"></span>
            Connect model to send messages
          </span>
          <span v-else-if="props.isLoading" class="flex items-center">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-nordic-primary animate-nordic-pulse mr-1.5"></span>
            Processing request...
          </span>
          <span v-else-if="props.currentInput.length > 0" class="hidden sm:inline">
            Press <span class="px-1 py-0.5 rounded text-xs bg-nordic-bg-light">Enter ↵</span> to send
          </span>
        </div>
        <div v-if="props.currentInput.length > 500" :class="{ 'text-nordic-error': props.currentInput.length > 1000 }">
          {{ props.currentInput.length }} characters
        </div>
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

/* Ensure animations are smooth */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(-10px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Pulse animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Spin animation */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>