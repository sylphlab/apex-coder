/**
 * @refresh reset
 */
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import copy from 'copy-to-clipboard'; // Import copy-to-clipboard
import { useConfig } from '../contexts/ConfigContext'; // Use Config Context hook
import { useChat, ChatMessage } from '../contexts/ChatContext'; // Use Chat Context hook and type
// Removed: import { vscode } from '../vscode'; // Actions now handled by store
const ChatView: React.FC = () => {
  // Local state for the input field only
  const [inputMessage, setInputMessage] = useState('');

  // Use Context hooks
  const { state: chatState, sendMessage, clearChat } = useChat();
  const { messages, isAssistantResponding } = chatState; // Destructure chat state
  const { state: configState } = useConfig(); // Get config state
  const { isConfigured } = configState; // Destructure config state
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // For auto-scrolling
  // Removed: const isConfigured = useConfigStore((state) => state.isConfigured); // Now obtained from useConfig

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Message handling logic is now moved to App.tsx useEffect hook
  // which calls actions in useChatStore.

  const handleSendMessage = () => {
    // Use the action from the store
    sendMessage(inputMessage);
    setInputMessage(''); // Clear input after sending
  };

  // --- Render ---
  return (
    // Use theme variables or specific Nordic colors. Assuming dark/light mode might be a factor later.
    // Using neutral colors for now.
    <div className="flex flex-col h-full p-3 bg-nord-bg text-nord-fg"> {/* Main container */}
      {/* Header (Optional) */}
      <div className="flex justify-between items-center mb-2">
        {/* <h2 className="text-lg font-semibold text-nord-fg-strong">Chat</h2> */}
        <button
          onClick={clearChat}
          disabled={messages.length === 0 || isAssistantResponding}
          className="text-xs px-2 py-0.5 border border-nord-border rounded text-nord-fg-muted hover:bg-nord-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Chat
        </button>
      </div>

      {/* Configuration Warning */}
      {!isConfigured && (
         <div className="mb-2 p-2 border border-nord-warn bg-nord-warn/20 text-nord-warn rounded text-sm">
           AI Provider not configured. Please go to Setup.
         </div>
      )}
      {/* Message List */}
      <div className="flex-grow overflow-y-auto mb-2 space-y-3 pr-1"> {/* Added space-y and padding-right */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`p-2 rounded-lg max-w-[85%] ${ // Adjusted max-width
              msg.role === 'user' ? 'bg-nord-accent text-nord-bg' :
              msg.role === 'assistant' ? 'bg-nord-bg-alt' : // Use a slightly different bg for assistant
              'bg-nord-error/20 text-nord-error border border-nord-error' // Error style
            }`} // Removed prose class, handle styling via markdown components
            >
              {/* Render content using ReactMarkdown */}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom renderer for code blocks to apply syntax highlighting
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative group bg-gray-800 rounded p-4 my-2"> {/* Container for positioning */}
                        <button
                          onClick={() => {
                            const codeToCopy = String(children).replace(/\n$/, '');
                            if (copy(codeToCopy)) {
                              // Optional: Add visual feedback (e.g., change button text briefly)
                              console.log('Code copied!');
                            } else {
                              console.error('Failed to copy code.');
                            }
                          }}
                          className="absolute top-1 right-1 p-1 bg-nord-bg-alt/80 rounded text-nord-fg-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Copy code"
                        >
                          Copy
                        </button>
                        <pre className="overflow-auto text-sm text-white">
                          <code className={`language-${match[1]}`} {...props}>
                            {String(children).replace(/\n$/, '')}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className={`${className} bg-nord-bg-alt p-1 rounded text-sm`} {...props}>
                        {children}
                      </code>
                    );
                  },
                   // Optional: Customize other elements like links, lists, etc.
                   a: ({node, ...props}) => <a className="text-nord-accent hover:underline" {...props} />,
                   ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
                   ol: ({node, ...props}) => <ol className="list-decimal list-inside" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div> {/* End of message bubble div (closes div from line 69) */}
          </div> /* End of message container div (closes div from line 65) */
        )) // End of messages.map expression
      } {/* End of JavaScript expression block for messages.map */}
        <div ref={messagesEndRef} /> {/* Anchor for auto-scrolling */}
      </div> {/* End of Message List div */}
      {/* Input Area */}
      <div className="flex items-center border-t border-nord-border pt-2"> {/* Added border top */}
        <textarea // Changed to textarea for multi-line input
          rows={1} // Start with 1 row
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            // Auto-resize textarea (simple example)
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => { // Use onKeyDown for Shift+Enter check
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // Prevent default newline on Enter
              handleSendMessage();
            }
            // Allow Shift+Enter for newline
          }}
          placeholder="Type your message (Shift+Enter for newline)..."
          disabled={isAssistantResponding || !isConfigured}
          className="flex-grow bg-nord-bg-input border border-nord-border rounded-md px-3 py-1.5 mr-2 resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-nord-accent disabled:opacity-60" // Adjusted styles
          style={{ maxHeight: '100px' }} // Limit max height
        />
        <button
          onClick={handleSendMessage}
          disabled={isAssistantResponding || !inputMessage.trim() || !isConfigured}
          className="px-3 py-1.5 bg-nord-accent text-nord-bg rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" // Adjusted styles
        >
          {isAssistantResponding ? '...' : 'Send'} {/* Indicate loading */}
        </button>
      </div>
    </div>
  );
};

export default ChatView;