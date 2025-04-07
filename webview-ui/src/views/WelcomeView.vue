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

const startChatting = () => {
  router.push('/chat');
};

const setupAI = () => {
  router.push('/setup');
};

// Animation states
const isLoaded = ref(false);

// Set isLoaded to true after a short delay to trigger animations
setTimeout(() => {
  isLoaded.value = true;
}, 100);
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full px-6 py-12 animate-nordic-fade-in">
    <!-- Logo/Header -->
    <div class="mb-8 text-center">
      <h1 class="text-3xl font-light mb-2 text-nordic-text-primary">Apex Coder</h1>
      <p class="text-nordic-text-muted max-w-md text-center">
        Your AI-powered coding assistant with support for multiple AI providers
      </p>
    </div>

    <!-- Main content with animation -->
    <div 
      class="card-nordic w-full max-w-2xl transition-all duration-500 transform"
      :class="{ 'translate-y-0 opacity-100': isLoaded, 'translate-y-4 opacity-0': !isLoaded }"
      style="transition-delay: 100ms;"
    >
      <!-- Status section -->
      <div class="p-6 border-b border-nordic-bg-light">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-medium text-nordic-text-primary">AI Status</h2>
          <div 
            class="px-3 py-1 rounded-full text-xs font-medium flex items-center"
            :class="props.isModelInitialized ? 'bg-nordic-success bg-opacity-20 text-nordic-success' : 'bg-nordic-error bg-opacity-20 text-nordic-error'"
          >
            <span class="w-2 h-2 rounded-full mr-1.5" :class="props.isModelInitialized ? 'bg-nordic-success' : 'bg-nordic-error'"></span>
            {{ props.isModelInitialized ? 'Ready' : 'Not Configured' }}
          </div>
        </div>

        <div class="bg-nordic-bg-light bg-opacity-50 rounded-lg p-4">
          <div class="flex flex-col space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-nordic-text-secondary text-sm">Provider</span>
              <span class="font-medium text-sm px-2.5 py-1 rounded-md bg-white shadow-nordic-sm">
                {{ props.configuredProvider || 'Not Set' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-nordic-text-secondary text-sm">Status</span>
              <span 
                class="font-medium text-sm px-2.5 py-1 rounded-md"
                :class="props.isModelInitialized ? 'bg-nordic-success bg-opacity-20 text-nordic-success' : 'bg-nordic-error bg-opacity-20 text-nordic-error'"
              >
                {{ props.isModelInitialized ? 'Connected' : 'Not Connected' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            @click="startChatting"
            class="btn-nordic-primary flex items-center justify-center"
            :class="{ 'opacity-50 cursor-not-allowed': !props.isModelInitialized }"
            :disabled="!props.isModelInitialized"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
            </svg>
            Start Chatting
          </button>
          <button 
            @click="setupAI"
            class="btn-nordic-secondary flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            Configure AI
          </button>
        </div>
      </div>
    </div>

    <!-- Features section -->
    <div 
      class="w-full max-w-2xl mt-6 grid grid-cols-1 md:grid-cols-3 gap-4"
      :class="{ 'translate-y-0 opacity-100': isLoaded, 'translate-y-4 opacity-0': !isLoaded }"
      style="transition-delay: 200ms; transition-duration: 500ms;"
    >
      <div class="card-nordic p-4 flex flex-col items-center text-center">
        <div class="w-10 h-10 rounded-full bg-nordic-primary bg-opacity-10 flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nordic-primary" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        <h3 class="text-sm font-medium mb-1 text-nordic-text-primary">Multiple Providers</h3>
        <p class="text-xs text-nordic-text-muted">Connect to your preferred AI provider</p>
      </div>
      
      <div class="card-nordic p-4 flex flex-col items-center text-center">
        <div class="w-10 h-10 rounded-full bg-nordic-accent bg-opacity-10 flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nordic-accent" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </div>
        <h3 class="text-sm font-medium mb-1 text-nordic-text-primary">Code Assistance</h3>
        <p class="text-xs text-nordic-text-muted">Get help with coding tasks</p>
      </div>
      
      <div class="card-nordic p-4 flex flex-col items-center text-center">
        <div class="w-10 h-10 rounded-full bg-nordic-success bg-opacity-10 flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-nordic-success" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
          </svg>
        </div>
        <h3 class="text-sm font-medium mb-1 text-nordic-text-primary">High Performance</h3>
        <p class="text-xs text-nordic-text-muted">Fast and responsive interface</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center text-xs text-nordic-text-muted">
      <p>Apex Coder • Powered by Vercel AI SDK</p>
    </div>
  </div>
</template>