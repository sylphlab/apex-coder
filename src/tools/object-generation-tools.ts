import type * as vscode from 'vscode';
import { z } from 'zod';

export interface GenerateObjectResult {
  success: boolean;
  generatedObject: unknown;
  error?: string;
  toolName: string;
  message: string;
}

export const generateObjectToolDefinition = {
  description: 'Generate structured objects from natural language',
  parameters: z.object({
    prompt: z.string().describe('Description of the object to generate'),
    schema: z.any().optional().describe('Optional schema for the object'),
  }),
  execute: async (
    arguments_: { prompt: string; schema?: unknown },
    _panel?: vscode.WebviewPanel, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<GenerateObjectResult> => {
    // 模擬實際實現
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!arguments_.prompt) {
      return {
        success: false,
        generatedObject: undefined,
        error: 'Prompt is required',
        toolName: 'generateObject',
        message: 'Failed to generate object',
      };
    }

    return {
      success: true,
      generatedObject: { sample: 'generated data' },
      toolName: 'generateObject',
      message: 'Object generated successfully',
    };
  },
};
