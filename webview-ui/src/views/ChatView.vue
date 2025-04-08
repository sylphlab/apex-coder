<script setup lang="ts">
import { ref, nextTick, watch, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { useConfigStore } from "../stores/configStore";
import ChatHeader from "../components/ChatHeader.vue";
import ChatMessageList from "../components/ChatMessageList.vue";
import ChatInputArea from "../components/ChatInputArea.vue";
import ChatEmptyState from "../components/ChatEmptyState.vue";
import ChatLoadingIndicator from "../components/ChatLoadingIndicator.vue";

// Define props received from App.vue (or parent)
const props = defineProps<{
  chatMessages: Array<any>;
  currentInput: string;
  isLoading: boolean;
  thinkingStepText: string | null;
}>();

// Use the config store
const configStore = useConfigStore();
const { isModelInitialized, configuredModelId } = storeToRefs(configStore);

// Define emits to send updates back up
const emit = defineEmits([
  "update:currentInput",
  "sendChatMessageWithImage",
  "getConfigStatus",
  "changeSettings",
  "update:modelId",
]);

// --- Refs ---
const chatContainer = ref<HTMLElement | null>(null);
const pendingImageBase64 = ref<string[]>([]); // Keep pending image state here

// --- Methods ---

// Method to handle sending message (triggered by ChatInputArea)
const handleSendFromInput = () => {
  const text = props.currentInput.trim();
  const images = pendingImageBase64.value;

  // Check conditions before emitting up
  if (
    (text || images.length > 0) &&
    isModelInitialized.value &&
    !props.isLoading
  ) {
    emit("sendChatMessageWithImage", { text, imagesBase64: images });
    // Clear input and pending images after initiating send
    emit("update:currentInput", ""); // Clear input via emit
    pendingImageBase64.value = []; // Clear images locally
  }
};

// --- Image Modal State & Methods ---
const isImageModalVisible = ref(false);
const modalImageSrc = ref("");
const openImageModal = (src: string) => {
  modalImageSrc.value = src;
  isImageModalVisible.value = true;
};
const closeImageModal = () => {
  isImageModalVisible.value = false;
  modalImageSrc.value = "";
};
// --- End Image Modal ---

// --- Scrolling Logic ---
const scrollToBottom = (smooth = false) => {
  nextTick(() => {
    if (chatContainer.value) {
      const scrollTarget = chatContainer.value;
      // Simplified check: scroll if near bottom or if it's one of the first messages
      const isNearBottom =
        scrollTarget.scrollHeight - scrollTarget.clientHeight <=
        scrollTarget.scrollTop + 50; // Adjust threshold as needed

      if (!smooth || isNearBottom || props.chatMessages.length <= 1) {
        scrollTarget.scrollTop = scrollTarget.scrollHeight;
      } else if (smooth) {
        scrollTarget.scrollTo({
          top: scrollTarget.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  });
};
watch(
  () => props.chatMessages,
  (newVal, oldVal) => {
    const wasMessageAdded = newVal.length > (oldVal?.length ?? 0);
    if (wasMessageAdded) {
      // Smooth scroll only if user is already near the bottom
      scrollToBottom(true); // Attempt smooth scroll
    }
    // Optionally handle scrolling upon message modification/deletion if needed
  },
  { deep: true },
);
onMounted(() => {
  scrollToBottom(false); // Initial scroll without smooth behavior
});
// --- End Scrolling Logic ---
</script>

<template>
  <div
    class="flex flex-col flex-grow overflow-hidden bg-nordic-bg-contrast relative"
  >
    <!-- Main Chat Area with Scroll -->
    <div
      class="flex-grow overflow-y-auto px-3 pt-3 pb-1 custom-scrollbar relative"
      ref="chatContainer"
    >
      <ChatHeader
        :is-loading="props.isLoading"
        @get-config-status="emit('getConfigStatus')"
        @change-settings="emit('changeSettings')"
      />

      <!-- Conditional Rendering: Empty State or Message List -->
      <ChatEmptyState
        v-if="
          props.chatMessages.length === 0 && pendingImageBase64.length === 0
        "
      />
      <ChatMessageList
        v-else
        :messages="props.chatMessages"
        @open-image="openImageModal"
      />

      <!-- Loading Indicator -->
      <ChatLoadingIndicator
        v-if="props.isLoading || props.thinkingStepText"
        :thinking-step-text="props.thinkingStepText"
      />
    </div>

    <!-- Input Area Component -->
    <ChatInputArea
      :current-input="props.currentInput"
      :is-loading="props.isLoading"
      :is-model-initialized="isModelInitialized"
      :configured-model-id="configuredModelId"
      :pending-image-base64="pendingImageBase64"
      @update:current-input="emit('update:currentInput', $event)"
      @update:pending-image-base64="pendingImageBase64 = $event"
      @update:model-id="emit('update:modelId', $event)"
      @send="handleSendFromInput"
    />

    <!-- Image Modal -->
    <transition name="modal-fade">
      <div
        v-if="isImageModalVisible"
        class="image-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/75"
        @click.self="closeImageModal"
      >
        <div class="relative max-w-[90vw] max-h-[90vh]">
          <img
            :src="modalImageSrc"
            alt="Enlarged image"
            class="block w-auto h-auto max-w-full max-h-full object-contain rounded shadow-lg"
          />
          <button
            @click="closeImageModal"
            class="absolute top-2 right-2 p-1 bg-nordic-bg/50 hover:bg-nordic-bg/80 text-white rounded-full text-xs leading-none"
            title="Close image"
          >
            <span class="i-carbon-close w-5 h-5"></span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Restore necessary styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--nordic-border, #4c566a);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--nordic-text-muted, #6a7388);
}

.image-modal-overlay {
  backdrop-filter: blur(3px);
}
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Ensure UnoCSS Icons work if not handled globally */
[class^="i-"],
[class*=" i-"] {
  display: inline-block;
  vertical-align: middle;
}
</style>
