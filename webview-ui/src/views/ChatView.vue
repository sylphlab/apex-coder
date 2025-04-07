<script setup lang="ts">
import { ref, defineProps, defineEmits, nextTick, onUpdated, watch, onMounted } from 'vue';
import * as anime from 'animejs';

// Define props received from App.vue
const props = defineProps<{
  chatMessages: Array<any>;
  currentInput: string;
  isLoading: boolean;
  isModelInitialized: boolean;
  configuredProvider: string | null;
  configuredModelId: string | null;
  thinkingStepText: string | null;
}>();

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
  if (props.currentInput.trim() && props.isModelInitialized && !props.isLoading) {
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
          
          anime.default({
            targets: lastMessageElement,
            opacity: [0, 1],
            translateY: [15, 0],
            duration: 500,
            easing: 'spring(1, 80, 10, 0)',
            complete: () => {
              // Reset inline styles after animation completes
              lastMessageElement.style.opacity = '';
              lastMessageElement.style.transform = '';
            }
          });
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
  <div class="flex flex-col flex-grow overflow-hidden px-3 pb-4">
    <!-- Status Bar -->
    <div class="flex items-center justify-between text-xs mb-4 pb-2 border-b-2 transition-colors duration-300" 
         :style="{
           borderColor: props.isModelInitialized 
             ? 'var(--vscode-statusBarItem-successBackground, #89d185)' 
             : 'var(--vscode-statusBarItem-errorBackground, #f14c4c)'
         }">
      <div class="flex items-center space-x-4" style="color: var(--vscode-descriptionForeground, #7f7f7f);">
        <div class="flex items-center">
          <span class="mr-1">Provider:</span>
          <span class="font-medium px-2 py-0.5 rounded-full text-xs" 
                style="color: var(--vscode-foreground, black); background-color: var(--vscode-badge-background, #eee);">
            {{ props.configuredProvider || 'None' }}
          </span>
        </div>
        <div class="flex items-center">
          <span class="mr-1">Model:</span>
          <span class="font-medium px-2 py-0.5 rounded-full text-xs" 
                style="color: var(--vscode-foreground, black); background-color: var(--vscode-badge-background, #eee);">
            {{ props.configuredModelId || 'default' }}
          </span>
        </div>
        <div class="flex items-center">
          <span class="mr-1">Status:</span>
          <span class="flex items-center px-2 py-0.5 rounded-full text-xs" 
                :style="{
                  backgroundColor: props.isModelInitialized 
                    ? 'var(--vscode-statusBarItem-successBackground, #89d185)' 
                    : 'var(--vscode-statusBarItem-errorBackground, #f14c4c)',
                  color: 'var(--vscode-statusBarItem-successForeground, white)'
                }">
            <span v-if="props.isModelInitialized" class="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5"></span>
            <span v-else class="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5"></span>
            {{ props.isModelInitialized ? 'Ready' : 'Not Ready' }}
          </span>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button @click="emit('getConfigStatus')" 
                :disabled="props.isLoading" 
                class="px-2.5 py-1.5 rounded text-xs transition-all duration-200 flex items-center"
                style="background-color: var(--vscode-button-secondaryBackground, #5f6a79); 
                       color: var(--vscode-button-secondaryForeground, white); 
                       border: 1px solid var(--vscode-button-secondaryBorder, transparent);"
                :style="{ opacity: props.isLoading ? '0.6' : '1' }">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          Refresh
        </button>
        <button @click="emit('changeSettings')" 
                class="px-2.5 py-1.5 rounded text-xs transition-all duration-200 flex items-center"
                style="background-color: var(--vscode-button-secondaryBackground, #5f6a79); 
                       color: var(--vscode-button-secondaryForeground, white); 
                       border: 1px solid var(--vscode-button-secondaryBorder, transparent);">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
          Settings
        </button>
      </div>
    </div>

    <!-- Chat Message Area -->
    <div class="flex-grow overflow-y-auto mb-4 pr-2 custom-scrollbar" 
         ref="chatContainer"
         style="background-color: var(--vscode-sideBar-background, white); 
                scrollbar-width: thin;
                scrollbar-color: var(--vscode-scrollbarSlider-background, rgba(100, 100, 100, 0.4)) transparent;">
      
      <!-- Chat Messages -->
      <div v-for="(msg, index) in props.chatMessages" 
           :key="msg.id || index"
           class="chat-message mb-4 px-4 py-3 rounded-2xl max-w-[85%] break-words transition-shadow duration-200 hover:shadow-md"
           :class="{
             'ml-auto rounded-tr-sm': msg.role === 'user',
             'mr-auto rounded-tl-sm': msg.role === 'assistant' || msg.error
           }"
           :style="{
             backgroundColor: msg.role === 'user'
               ? 'var(--vscode-button-background, #007acc)'
               : msg.error
                 ? 'var(--vscode-inputValidation-errorBackground, #f8d7da)'
                 : 'var(--vscode-input-background, #eee)',
             color: msg.role === 'user'
               ? 'var(--vscode-button-foreground, white)'
               : msg.error
                 ? 'var(--vscode-inputValidation-errorForeground, #721c24)'
                 : 'var(--vscode-input-foreground, black)',
             border: msg.error ? '1px solid var(--vscode-inputValidation-errorBorder, #f5c6cb)' : 'none',
             boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
           }">
        <!-- Message header/metadata if needed -->
        <div v-if="msg.role && msg.role !== 'error'" 
             class="text-xs opacity-75 mb-1 font-medium"
             :style="{ 
               color: msg.role === 'user' 
                 ? 'var(--vscode-button-foreground, white)' 
                 : 'var(--vscode-descriptionForeground, #7f7f7f)'
             }">
          {{ msg.role === 'user' ? 'You' : 'Assistant' }}
        </div>
        
        <!-- Message content -->
        <pre class="whitespace-pre-wrap text-sm leading-relaxed font-sans">{{ msg.content }}</pre>
      </div>
      
      <!-- Loading Indicator / Thinking Step -->
      <div v-if="props.isLoading" 
           class="mb-4 px-4 py-3 rounded-2xl max-w-[85%] mr-auto rounded-tl-sm shadow-sm inline-flex items-center text-sm" 
           style="background-color: var(--vscode-input-background, #eee); 
                  color: var(--vscode-descriptionForeground, #7f7f7f);
                  border-left: 3px solid var(--vscode-progressBar-background, #0e70c0);">
        <template v-if="props.thinkingStepText">
          <!-- Display thinking step text with a subtle indicator -->
          <div class="flex items-center">
            <div class="mr-2 flex space-x-1">
              <span class="block w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse"></span>
              <span class="block w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse" style="animation-delay: 0.2s"></span>
              <span class="block w-2 h-2 rounded-full bg-blue-400 opacity-75 animate-pulse" style="animation-delay: 0.4s"></span>
            </div>
            <span class="whitespace-pre-wrap">{{ props.thinkingStepText }}</span>
          </div>
        </template>
        <template v-else>
          <!-- Improved dot animation -->
          <div class="flex items-center justify-center space-x-1">
            <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0s"></span>
            <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
            <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></span>
          </div>
        </template>
      </div>
    </div>

    <!-- Chat Input Area -->
    <div class="flex flex-col mt-4 pt-4 border-t transition-all duration-300" 
         :class="{ 'border-opacity-70': isTextareaFocused }"
         style="border-color: var(--vscode-editorWidget-border, #ccc);">
      
      <!-- Modern chat input container -->
      <div class="flex items-center bg-opacity-50 p-1 rounded-2xl"
           :class="{ 'ring-2 ring-offset-1': isTextareaFocused }"
           :style="{
             backgroundColor: 'var(--vscode-editor-background, #f5f5f5)',
             borderColor: isTextareaFocused 
               ? 'var(--vscode-focusBorder, #0090ff)'
               : 'var(--vscode-input-border, #ccc)',
             boxShadow: isTextareaFocused 
               ? '0 0 0 1px var(--vscode-focusBorder, rgba(0, 144, 255, 0.2))'
               : '0 1px 3px rgba(0, 0, 0, 0.05)'
           }">
        
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
            :disabled="props.isLoading || !props.isModelInitialized"
            class="w-full py-2 px-3 resize-none min-h-[44px] max-h-[150px] overflow-y-auto font-sans text-sm transition-all duration-200 focus:outline-none bg-transparent rounded-xl"
            :class="{ 'opacity-60': props.isLoading || !props.isModelInitialized }"
            :style="{
              color: 'var(--vscode-input-foreground, black)',
              border: 'none'
            }"
          ></textarea>
          
          <!-- Disabled state overlay -->
          <div v-if="!props.isModelInitialized" 
               class="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-5 backdrop-blur-[1px]">
            <div class="px-3 py-1.5 bg-black bg-opacity-70 text-white rounded-full text-xs">
              <span class="inline-block w-2 h-2 rounded-full bg-red-400 mr-1.5"></span>
              Model not initialized
            </div>
          </div>
        </div>
        
        <!-- Send button (circular design) -->
        <button 
          @click="handleSend" 
          :disabled="props.isLoading || !props.currentInput.trim() || !props.isModelInitialized" 
          class="flex items-center justify-center h-10 w-10 rounded-full cursor-pointer transition-all duration-200"
          :class="{ 
            'opacity-50 scale-95': props.isLoading || !props.currentInput.trim() || !props.isModelInitialized,
            'hover:scale-105': !(props.isLoading || !props.currentInput.trim() || !props.isModelInitialized)
          }"
          :style="{
            backgroundColor: 'var(--vscode-button-background, #007acc)', 
            color: 'var(--vscode-button-foreground, white)', 
            border: 'none',
            transform: props.isLoading || !props.currentInput.trim() || !props.isModelInitialized ? 'none' : 'translateY(0)'
          }">
          <template v-if="props.isLoading">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      
      <!-- Text counter and hints (optional) -->
      <div class="flex justify-between items-center text-xs mt-1 px-2" style="color: var(--vscode-descriptionForeground, #7f7f7f);">
        <div>
          <span v-if="!props.isModelInitialized" class="text-xs">
            <span style="color: var(--vscode-errorForeground, #f14c4c);">●</span> Connect model to send messages
          </span>
          <span v-else-if="props.isLoading" class="text-xs">
            <span style="color: var(--vscode-progressBar-background, #0e70c0);">●</span> Processing request...
          </span>
          <span v-else-if="props.currentInput.length > 0" class="text-xs">
            Press <span class="px-1 py-0.5 rounded text-xs bg-opacity-20" style="background-color: var(--vscode-editor-lineHighlightBackground, #f0f0f0);">Enter ↵</span> to send
          </span>
        </div>
        <div v-if="props.currentInput.length > 500" class="text-xs" :style="{ color: props.currentInput.length > 1000 ? 'var(--vscode-errorForeground, #f14c4c)' : undefined }">
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