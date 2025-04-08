<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';

const props = defineProps<{
  currentInput: string;
  isLoading: boolean;
  isModelInitialized: boolean;
  configuredModelId: string | null;
  pendingImageBase64: string[]; // Receive pending images from parent
}>();

const emit = defineEmits<{
  (e: 'update:currentInput', value: string): void;
  (e: 'update:pendingImageBase64', value: string[]): void; // Emit changes back up
  (e: 'send'): void; // Simplified send event
  (e: 'update:modelId', modelId: string): void;
  // Removed 'sendChatMessageWithImage' - parent will handle combining text/images
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const isTextareaFocused = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// --- Input Handling ---
const handleFocus = () => { isTextareaFocused.value = true; };
const handleBlur = () => { isTextareaFocused.value = false; };

// Auto-resize textarea based on content
const autoResizeTextarea = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
    // Consider max height based on props or fixed value
    textareaRef.value.style.height = `${Math.min(textareaRef.value.scrollHeight, 150)}px`;
  }
};

// Watch for changes in currentInput to resize textarea
watch(() => props.currentInput, () => {
  autoResizeTextarea();
});

// Watch for pending images change (passed as prop) to resize
watch(() => props.pendingImageBase64, () => {
  nextTick(() => autoResizeTextarea());
}, { deep: true });

onMounted(() => {
  autoResizeTextarea();
});

// --- Sending Logic ---
const handleSend = () => {
  // Only emit send event, parent (ChatView) decides if conditions are met
  if (!props.isLoading && props.isModelInitialized) {
      emit('send');
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
  // Let other keys behave normally
};

// --- Image Handling ---
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  const newImages: string[] = []; // Store newly read images

  if (files) {
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        readers.push(new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result && !props.pendingImageBase64.includes(result)) { // Avoid duplicates from parent state
              resolve(result);
            } else {
              resolve(''); // Resolve empty if duplicate or invalid
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }));
      }
    }

    Promise.all(readers).then(results => {
      const validResults = results.filter(r => r); // Filter out empty strings
      if (validResults.length > 0) {
        // Emit updated array to parent
        emit('update:pendingImageBase64', [...props.pendingImageBase64, ...validResults]);
      }
       // Optionally focus after selection
      textareaRef.value?.focus();
    }).catch(error => {
        console.error("Error reading files:", error);
        // Handle error appropriately (e.g., show notification)
    });
  }

  // Reset file input value
  if (target) {
    target.value = '';
  }
};

const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  let imagePasted = false;
  const readers: Promise<string>[] = [];

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) {
        imagePasted = true;
         readers.push(new Promise((resolve, reject) => {
           const reader = new FileReader();
           reader.onload = (e) => {
              const result = e.target?.result as string;
               if (result && !props.pendingImageBase64.includes(result)) {
                  resolve(result);
               } else {
                   resolve('');
               }
           };
           reader.onerror = reject;
           reader.readAsDataURL(file);
         }));
      }
    }
  }

  if (imagePasted) {
    event.preventDefault(); // Prevent default paste only if an image was handled
    Promise.all(readers).then(results => {
        const validResults = results.filter(r => r);
        if(validResults.length > 0) {
           emit('update:pendingImageBase64', [...props.pendingImageBase64, ...validResults]);
        }
    }).catch(error => {
        console.error("Error reading pasted files:", error);
    });
  }
};

const removePendingImage = (index: number) => {
  const updatedImages = [...props.pendingImageBase64];
  updatedImages.splice(index, 1);
  emit('update:pendingImageBase64', updatedImages);
};

// --- Model Selection ---
const handleModelChange = (event: Event) => {
  const newModelId = (event.target as HTMLSelectElement).value;
  emit('update:modelId', newModelId);
};

</script>

<template>
  <div class="input-section-container px-3 pt-2 pb-1 bg-nordic-bg">
    <!-- Pending Images Preview -->
    <div v-if="pendingImageBase64.length > 0" class="pending-images-container mb-2 overflow-x-auto custom-scrollbar pb-2">
      <div class="flex space-x-2">
        <div v-for="(imgSrc, index) in pendingImageBase64" :key="index" class="pending-image-preview relative flex-shrink-0">
          <img :src="imgSrc" alt="Pending upload" class="h-16 w-auto rounded border border-nordic-border shadow-sm object-contain bg-nordic-bg-darker">
          <button @click="removePendingImage(index)" class="absolute top-0 right-0 -mt-1 -mr-1 p-0.5 bg-nordic-error text-white rounded-full text-xs leading-none z-10" title="Remove image">
            <span class="i-carbon-close w-3 h-3"></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Input Row Block -->
    <div
      class="input-row-block flex flex-col bg-nordic-bg-light rounded-lg px-2 py-1 transition-all duration-200 ease-in-out"
      :class="{ 'input-row-focused': isTextareaFocused }"
    >
      <div class="flex items-end space-x-2 w-full">
        <!-- Upload Button -->
        <button
          @click="triggerFileInput"
          class="btn-nordic-ghost-sm flex-shrink-0 mb-0.5 text-nordic-text-muted hover:text-nordic-text"
          title="Upload Image(s)"
          :disabled="isLoading"
          :class="{'opacity-50 cursor-not-allowed': isLoading}"
        >
          <span class="i-carbon-image-add w-5 h-5"></span>
        </button>

        <!-- Hidden File Input -->
        <input type="file" ref="fileInputRef" @change="handleFileSelected" accept="image/*" multiple class="hidden" />

        <!-- Textarea -->
        <textarea
          ref="textareaRef"
          :value="props.currentInput"
          @input="emit('update:currentInput', ($event.target as HTMLTextAreaElement).value)"
          @keydown="handleKeydown"
          @paste="handlePaste"
          @focus="handleFocus"
          @blur="handleBlur"
          :disabled="isLoading || !isModelInitialized"
          placeholder="Message..."
          rows="1"
          class="flex-grow bg-transparent text-sm resize-none outline-none placeholder-nordic-text-muted/70 py-1.5 custom-textarea-scrollbar"
          :class="{ 'opacity-60 cursor-not-allowed': isLoading || !isModelInitialized }"
        ></textarea>

        <!-- Send Button -->
        <button
          @click="handleSend"
          :disabled="(props.currentInput.trim().length === 0 && pendingImageBase64.length === 0) || isLoading || !isModelInitialized"
          class="btn-nordic-primary-sm flex-shrink-0 mb-0.5"
          :class="{
            'opacity-50 cursor-not-allowed': (props.currentInput.trim().length === 0 && pendingImageBase64.length === 0) || isLoading || !isModelInitialized,
            'bg-nordic-primary': (props.currentInput.trim().length > 0 || pendingImageBase64.length > 0) && !isLoading && isModelInitialized,
            'bg-nordic-bg-muted text-nordic-text-muted': !(props.currentInput.trim().length > 0 || pendingImageBase64.length > 0) || isLoading || !isModelInitialized
          }"
          title="Send Message"
        >
          <span class="i-carbon-send-alt w-4 h-4"></span>
        </button>
      </div>

      <!-- Model Selector Row -->
      <div class="flex justify-start w-full pt-1 mt-1 border-t border-nordic-border/10">
        <button
          @click="handleModelChange"
          class="model-selector-trigger flex items-center text-xs text-nordic-text-muted hover:text-nordic-text transition-colors duration-150 px-1 py-0.5 rounded"
          :disabled="isLoading"
          title="Select Model"
        >
          <span class="i-carbon-chip w-3.5 h-3.5 mr-1"></span>
          <span>{{ configuredModelId || 'Select Model' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Keep relevant styles, potentially move some generic ones (like scrollbar) to a global style if reused */

/* Pending Images Container Style */
.pending-images-container {
  /* Allows horizontal scrolling */
}

/* Individual Pending Image Preview Style */
.pending-image-preview {
  background-color: var(--nordic-bg-darker, #252a33);
  padding: 0.25rem;
  border-radius: 0.375rem; /* rounded-md */
  box-shadow: var(--nordic-shadow-xs);
}
.pending-image-preview img {
    display: block; /* Prevents extra space below image */
}

/* Textarea Custom Scrollbar Styles */
.custom-textarea-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-textarea-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-textarea-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}
.custom-textarea-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--nordic-border, #4c566a);
}
.custom-textarea-scrollbar::-webkit-scrollbar-thumb:hover {
   background: var(--nordic-text-muted, #6a7388);
}

/* Input Row Block Focus Style */
.input-row-block.input-row-focused {
  background-color: var(--nordic-bg-hover, #434c5e);
}

/* Muted background for disabled send button */
.bg-nordic-bg-muted {
    background-color: var(--nordic-bg-muted, #3b4252);
}

/* Button Styles (can be reused from ChatView or made global) */
.btn-nordic-ghost-sm {
  @apply p-1.5 rounded text-nordic-text-secondary hover:bg-nordic-bg-hover hover:text-nordic-text transition-colors duration-150;
}
.btn-nordic-primary-sm {
   @apply p-1.5 rounded transition-colors duration-150;
}

/* Ensure UnoCSS Icons work */
[class^="i-"], [class*=" i-"] {
  display: inline-block;
  vertical-align: middle;
}
</style> 