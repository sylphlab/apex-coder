<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
  configuredProvider: string | null;
  isModelInitialized: boolean;
}>();

const emit = defineEmits([
  'getConfigStatus',
  'changeSettings',
]);

const router = useRouter();

// Simplified flow - just one main action
const setupAI = () => {
  router.push('/setup');
};

// Only used if already configured
const startChatting = () => {
  router.push('/chat');
};

// Animation states
const isLoaded = ref(false);

// Set isLoaded to true after a short delay to trigger animations
setTimeout(() => {
  isLoaded.value = true;
}, 100);
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full px-6 py-8 animate-nordic-fade-in">
    <!-- Logo/Header -->
    <div class="mb-6 text-center">
      <h1 class="text-3xl font-light mb-2 text-nordic-text-primary">Apex Coder</h1>
      <p class="text-nordic-text-muted max-w-md text-center">
        Your AI-powered coding assistant
      </p>
    </div>

    <!-- Main content with animation - Simplified user-first design -->
    <div
      class="card-nordic w-full max-w-md transition-all duration-500 transform"
      :class="{ 'translate-y-0 opacity-100': isLoaded, 'translate-y-4 opacity-0': !isLoaded }"
      style="transition-delay: 100ms;"
    >
      <div class="p-6">
        <!-- Welcome message -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
            </svg>
          </div>
          <h2 class="text-xl font-medium mb-2 text-nordic-text-primary">Welcome to Apex Coder</h2>
          <p class="text-nordic-text-secondary mb-2">Get started with your AI coding assistant</p>
          
          <!-- Status indicator - simplified -->
          <div v-if="!props.isModelInitialized" class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 mb-2">
            <span class="w-2 h-2 rounded-full mr-1.5 bg-blue-500"></span>
            Setup needed
          </div>
          <div v-else class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 mb-2">
            <span class="w-2 h-2 rounded-full mr-1.5 bg-green-500"></span>
            Ready to use
          </div>
        </div>

        <!-- Action buttons - Streamlined flow -->
        <div class="space-y-3">
          <!-- Main action button - Get Started -->
          <button
            @click="setupAI"
            class="btn-nordic-primary w-full flex items-center justify-center py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
            </svg>
            Get Started
          </button>
          
          <!-- Only show Start Chatting if already configured -->
          <button
            v-if="props.isModelInitialized"
            @click="startChatting"
            class="btn-nordic-secondary w-full flex items-center justify-center py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
            </svg>
            Start Chatting
          </button>
        </div>
      </div>
    </div>

    <!-- Provider info - Simplified -->
    <div
      class="w-full max-w-md mt-6 flex flex-col space-y-2"
      :class="{ 'translate-y-0 opacity-100': isLoaded, 'translate-y-4 opacity-0': !isLoaded }"
      style="transition-delay: 200ms; transition-duration: 500ms;"
    >
      <div class="text-center text-sm text-nordic-text-secondary mb-2">
        <span>Supported AI Providers:</span>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        <span class="px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-xs">OpenAI</span>
        <span class="px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-xs">Anthropic</span>
        <span class="px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs">Google AI</span>
        <span class="px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs">Ollama</span>
        <span class="px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs">Mistral</span>
        <span class="px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs">+ More</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-6 text-center text-xs text-[var(--vscode-descriptionForeground,#7B88A1)]">
      <p>Apex Coder • Powered by Vercel AI SDK</p>
    </div>
  </div>
</template>