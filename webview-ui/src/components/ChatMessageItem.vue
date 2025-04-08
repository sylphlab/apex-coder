<script setup lang="ts">
import { computed } from 'vue';
import { useConfigStore } from '../stores/configStore'; // Needed for model ID

// Assuming message structure is passed down
const props = defineProps<{
  message: {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    imagesBase64?: string[];
    error?: boolean;
  };
}>();

const emit = defineEmits<{
  (e: 'openImage', src: string): void; // Emit event to open image modal
}>();

const configStore = useConfigStore();
const configuredModelId = computed(() => configStore.configuredModelId);

const handleImageClick = (src: string) => {
  emit('openImage', src);
};
</script>

<template>
  <div class="chat-message">
    <!-- User Message -->
    <div v-if="message.role === 'user'" class="flex justify-end">
      <div class="max-w-[85%] px-3 py-2.5 rounded-xl shadow-nordic-xs bg-nordic-primary/90 text-white">
        <!-- User Images -->
        <div v-if="message.imagesBase64 && message.imagesBase64.length > 0" class="flex flex-wrap gap-2 mb-2">
          <button
            v-for="(imgSrc, imgIndex) in message.imagesBase64"
            :key="imgIndex"
            @click="handleImageClick(imgSrc)"
            class="focus:outline-none focus:ring-2 focus:ring-nordic-accent ring-offset-2 ring-offset-nordic-primary/90 rounded-md overflow-hidden"
          >
            <img :src="imgSrc" alt="User image" class="block max-w-[100px] max-h-24 rounded-md object-contain bg-white/10 hover:opacity-80 transition-opacity">
          </button>
        </div>
        <!-- User Text -->
        <div v-if="message.content" class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</div>
      </div>
    </div>

    <!-- Assistant Message -->
    <div v-else-if="message.role === 'assistant'" class="flex justify-start">
      <div
        class="max-w-[85%] px-3.5 py-2.5 rounded-xl shadow-nordic-xs"
        :class="message.error ? 'bg-nordic-error/10 text-nordic-error' : 'bg-nordic-bg'"
      >
        <!-- Model ID -->
        <div class="text-xs text-nordic-text-muted mb-1 flex items-center">
          <span v-if="configuredModelId && !message.error" class="font-semibold text-nordic-text-secondary">
             {{ configuredModelId }}
          </span>
           <span v-else-if="message.error" class="font-semibold text-nordic-error">
             Error
           </span>
        </div>
        <!-- Assistant Text -->
        <div class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</div>
      </div>
    </div>
     <!-- Add handling for other roles like 'system' if needed -->
  </div>
</template>

<style scoped>
/* Styles specific to a single message item can go here if necessary */
/* For now, most styles are handled by utility classes */
</style> 