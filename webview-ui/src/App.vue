<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { vscode, type VsCodeMessage } from './vscode'; // Import the wrapper

// Define message structure for Vercel AI SDK CoreMessage format
interface CoreMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  // Add tool_calls / tool_responses if needed later
}

const aiSdkStatus = ref<string>('Unknown'); // Renamed status state
const chatMessages = ref<CoreMessage[]>([]); // Store chat history
const currentInput = ref<string>(''); // User input
const isLoading = ref<boolean>(false); // Loading indicator for AI response
const currentStreamId = ref<string | null>(null); // Track the current streaming request

let removeListener: (() => void) | null = null;

// Function to check AI SDK status
const checkStatus = () => {
  const requestId = `status-${Date.now()}`;
  const message: VsCodeMessage = { command: 'checkAiSdkStatus', requestId: requestId }; // Use new command name
  aiSdkStatus.value = 'Checking...';
  vscode.postMessage(message);
};

// Function to send chat message and handle stream
const sendChatMessage = async () => {
  if (!currentInput.value.trim() || isLoading.value) return;

  const userMessage: CoreMessage = { role: 'user', content: currentInput.value };
  chatMessages.value.push(userMessage); // Add user message to display
  const historyToSend = chatMessages.value.slice(0, -1); // Send history excluding the latest user message

  const requestId = `chat-${Date.now()}`;
  currentStreamId.value = requestId; // Track this stream
  isLoading.value = true;
  const message: VsCodeMessage = {
    command: 'streamChatCompletion', // Use the new command
    requestId: requestId,
    payload: {
      // Pass history in the expected format (adjust if needed based on CoreMessage definition)
      history: historyToSend.map(m => ({ role: m.role, content: m.content })),
      prompt: userMessage.content,
    }
  };
  vscode.postMessage(message);
  currentInput.value = ''; // Clear input field

  // Add a placeholder for the assistant's response
  chatMessages.value.push({ role: 'assistant', content: '' });
  await nextTick(); // Ensure DOM updates before scrolling
  scrollToBottom();
};

// Function to handle incoming messages from the extension
const handleExtensionMessage = (event: MessageEvent<any>) => {
    const message = event.data; // No strict type assertion here, check properties
    console.log('Received message from extension:', message);

    if (typeof message !== 'object' || message === null || !message.command || !message.requestId) {
        console.warn('Received malformed message:', message);
        return;
    }

    // Handle Status Response
    if (message.command === 'response' && message.requestId.startsWith('status-')) {
        if (message.error) {
            aiSdkStatus.value = `Error: ${message.error}`;
        } else if (message.payload) {
            aiSdkStatus.value = `Status: ${message.payload.status || 'unknown'}${message.payload.provider ? ` (Provider: ${message.payload.provider})` : ''}`;
        } else {
             aiSdkStatus.value = 'Unknown status received';
        }
        return; // Handled status response
    }

    // Handle Stream Chunks
    if (message.command === 'streamChunk' && message.requestId === currentStreamId.value) {
        const lastMessageIndex = chatMessages.value.length - 1;
        if (lastMessageIndex >= 0 && chatMessages.value[lastMessageIndex].role === 'assistant') {
            chatMessages.value[lastMessageIndex].content += message.payload?.textPart || '';
            scrollToBottom(); // Scroll as content arrives
        }
    }

    // Handle Stream End
    if (message.command === 'streamEnd' && message.requestId === currentStreamId.value) {
        isLoading.value = false;
        currentStreamId.value = null;
        console.log('Stream finished.');
        scrollToBottom();
    }

     // Handle Errors for Chat Request
    if (message.command === 'response' && message.requestId === currentStreamId.value && message.error) {
        isLoading.value = false;
        currentStreamId.value = null;
        // Maybe display error in the chat?
        const lastMessageIndex = chatMessages.value.length - 1;
         if (lastMessageIndex >= 0 && chatMessages.value[lastMessageIndex].role === 'assistant') {
             chatMessages.value[lastMessageIndex].content += `\n\n**Error:** ${message.error}`;
         } else {
             chatMessages.value.push({ role: 'assistant', content: `**Error:** ${message.error}` });
         }
        console.error('Chat stream failed:', message.error);
        scrollToBottom();
    }
};

// Helper to scroll chat to bottom
const chatContainer = ref<HTMLElement | null>(null);
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

onMounted(() => {
  removeListener = vscode.onMessage(handleExtensionMessage);
  checkStatus(); // Check status on mount
});

onUnmounted(() => {
  if (removeListener) {
    removeListener();
  }
});

</script>

<template>
  <div class="chat-app">
    <h1>Apex Coder</h1>
    <p>AI SDK Status: <strong>{{ aiSdkStatus }}</strong> <button @click="checkStatus" :disabled="isLoading">Check Status</button></p>
    <hr>

    <div class="chat-messages" ref="chatContainer">
      <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.role]">
        <span class="role">{{ msg.role }}</span>
        <!-- Use v-html carefully or sanitize if content can contain HTML -->
        <pre class="content">{{ msg.content }}</pre>
      </div>
       <div v-if="isLoading" class="message assistant">
         <span class="role">assistant</span>
         <span class="content loading">▍</span> <!-- Simple loading indicator -->
       </div>
    </div>

    <div class="chat-input">
      <textarea
        v-model="currentInput"
        placeholder="Enter your message..."
        @keydown.enter.prevent="sendChatMessage"
        :disabled="isLoading"
      ></textarea>
      <button @click="sendChatMessage" :disabled="isLoading || !currentInput.trim()">
        {{ isLoading ? 'Sending...' : 'Send' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Add some basic styling */
h1 {
  color: #42b883;
}
button {
  margin: 5px;
  padding: 8px 15px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #36a374;
}
pre {
  text-align: left;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
