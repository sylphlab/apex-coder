import type { BaseAIProvider } from '../ai-sdk/providers/baseProvider.js';

export interface ToolContext {
  aiModel?: BaseAIProvider;
  workspaceRoot?: string;
  configuration?: {
    get: (key: string) => unknown;
  };
  secrets?: {
    get: (key: string) => Promise<string | undefined>;
    store: (key: string, value: string) => Promise<void>;
  };
}
