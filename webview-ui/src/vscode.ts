import type { WebviewApi } from 'vscode-webview';

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing between the webview and the extension host.
 *
 * NOTE: This utility assumes it's run within a VS Code webview context.
 */
class VsCodeApiWrapper {
  private readonly vscodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current context.
    // Cast window to any to access potentially injected functions like acquireVsCodeApi
    const global = window as any;
    if (typeof global.acquireVsCodeApi === 'function') {
      this.vscodeApi = global.acquireVsCodeApi();
    } else {
      console.warn('acquireVsCodeApi function not found. Running outside VS Code webview?');
      // Provide a mock API for development outside VS Code if needed
      // this.vscodeApi = { postMessage: (message) => console.log('Mock postMessage:', message), getState: () => undefined, setState: () => {} };
    }
  }

  /**
   * Post a message to the extension host.
   * @param message The message to send.
   */
  public postMessage(message: unknown) {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.warn('VS Code API not available. Message not sent:', message);
    }
  }

  /**
   * Add a listener for messages from the extension host.
   * @param callback The callback function to handle received messages.
   * @returns A function to remove the listener.
   */
  public onMessage(callback: (message: MessageEvent<unknown>) => void): () => void {
    window.addEventListener('message', callback);
    return () => window.removeEventListener('message', callback);
  }

  /**
   * Get the persistent state object for the webview.
   * @returns The state object or undefined if not available.
   */
   public getState(): unknown | undefined {
    return this.vscodeApi?.getState();
  }

  /**
   * Set the persistent state object for the webview.
   * @param newState The new state object.
   */
  public setState(newState: unknown): void {
    this.vscodeApi?.setState(newState);
  }
}

// Export a singleton instance of the wrapper
export const vscode = new VsCodeApiWrapper();

// Example message structure (optional, but good practice)
export interface VsCodeMessage {
    command: string;
    payload?: unknown;
    requestId?: string; // Optional for request-response patterns
}

export interface VsCodeResponse {
    command: 'response';
    requestId: string;
    payload?: unknown;
    error?: string;
}