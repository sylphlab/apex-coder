<script setup lang="ts">
import ChatMessageItem from "./ChatMessageItem.vue"; // Import the item component

const props = defineProps<{
  messages: Array<any>; // Array of message objects
}>();

const emit = defineEmits<{
  (e: "openImage", src: string): void; // Pass event up to ChatView
}>();

const handleOpenImage = (src: string) => {
  emit("openImage", src);
};
</script>

<template>
  <transition-group
    tag="div"
    name="message-transition"
    class="space-y-5 pt-6 pb-4"
    appear
  >
    <ChatMessageItem
      v-for="(msg, index) in props.messages"
      :key="msg.id || index"
      :message="msg"
      @open-image="handleOpenImage"
    />
  </transition-group>
</template>

<style scoped>
/* Message Transition styles should move here from ChatView */
.message-transition-enter-active,
.message-transition-leave-active {
  transition: all 0.3s ease-out;
}
.message-transition-leave-active {
  position: absolute; /* Important for smooth list animations */
  /* Calculate width based on parent padding if needed, or use 100% */
  width: calc(100% - 1.5rem); /* Assuming parent has px-3 */
  /* Or potentially: width: 100%; */
}

.message-transition-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.message-transition-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.message-transition-leave-from {
  opacity: 1;
}
.message-transition-leave-to {
  opacity: 0;
}
</style>
