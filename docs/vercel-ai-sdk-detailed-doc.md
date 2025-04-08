# Vercel AI SDK - Detailed Technical Documentation

<!-- Version: 1.0 | Generated: 2025-07-04 -->

This document provides a detailed summary of the Vercel AI SDK based on a page-by-page review of the official documentation (sdk.vercel.ai/docs).

## Table of Contents

_(To be populated as documentation is reviewed)_

## Review Log

_(Tracking visited pages and key findings)_

---

## 1. Introduction (sdk.vercel.ai/docs/introduction)

**Reviewed:** 2025-07-04

**Core Goal:** Simplify LLM integration for developers using TypeScript across various frameworks (React, Next.js, Vue, Svelte, Node.js, etc.).

**Key Components:**

- **AI SDK Core:** Provides a unified API for interacting with different LLM providers. Handles text generation, structured object generation, tool calls, and agent building.
- **AI SDK UI:** Offers framework-agnostic hooks (primarily for React, Vue, Svelte via adapter packages) to build chat and generative UI elements quickly.

**Supported Providers (Official Examples from Intro Page):**

- xAI Grok (`@ai-sdk/xai`)
- OpenAI (`@ai-sdk/openai`)
- Azure OpenAI (`@ai-sdk/azure`)
- Anthropic (`@ai-sdk/anthropic`)
- Amazon Bedrock (`@ai-sdk/amazon-bedrock`)
- Google Generative AI (`@ai-sdk/google`)
- Google Vertex AI (`@ai-sdk/google-vertex`)
- Mistral (`@ai-sdk/mistral`)
- Together.ai (`@ai-sdk/togetherai`)
- Cohere (`@ai-sdk/cohere`)
- Fireworks (`@ai-sdk/fireworks`)
- DeepInfra (`@ai-sdk/deepinfra`)
- DeepSeek (`@ai-sdk/deepseek`)
- Cerebras (`@ai-sdk/cerebras`)
- Groq (`@ai-sdk/groq`)
- Perplexity (`@ai-sdk/perplexity`)
- Fal AI (`@ai-sdk/fal` - Note: Intro page only listed Image Gen capability)
- Luma AI (`@ai-sdk/luma` - Note: Intro page only listed Image Gen capability)
  _Note: A more comprehensive list is available on the dedicated Providers page._

**Provider Capabilities Overview (from Intro Page - High Level):**

- Capabilities like Image Input, Image Generation, Object Generation, Tool Usage, and Tool Streaming vary significantly between providers and specific models. Detailed comparison tables are available elsewhere in the docs.

**Templates & Starters:**

- Numerous templates are available on vercel.com/templates?type=ai covering various use cases (Chatbot, RAG, Multi-modal, Semantic Search, NL Postgres Query), frameworks (Next.js, Nuxt, SvelteKit, Solid), and features (Feature Flags, Telemetry, Generative UI, Security).

**Community:**

- GitHub Discussions is the primary community forum.

**Full Documentation Access (`llms.txt`):**

- The entire documentation is available in Markdown format at `sdk.vercel.ai/llms.txt`, suitable for feeding to LLMs for Q&A.

**Next Section in Docs:** Foundations

---

## 2. Foundations (sdk.vercel.ai/docs/foundations)

**Reviewed:** 2025-07-04 (Overview Page)

This section covers fundamental concepts related to AI, LLMs, and how the AI SDK approaches them.

**Sub-sections:**

- **Overview:** Basic concepts of AI and LLMs.
- **Providers and Models:** Details on supported AI providers and their models (Visited: `sdk.vercel.ai/docs/foundations/providers-and-models`).
- **Prompts:** How prompts are used and defined within the SDK.
- **Tools:** Concepts related to tools in the SDK.
- **Streaming:** Explanation of why streaming is important for AI applications.
- **Agents:** How to build agents using the SDK.

**Next Section to Review:** Foundations > Overview (`sdk.vercel.ai/docs/foundations/overview` - Note: This seems redundant based on the current page, will navigate to 'Prompts' next based on the structure listed here).

---

### 2.1 Prompts (sdk.vercel.ai/docs/foundations/prompts)

**Reviewed:** 2025-07-04

This section explains how prompts (instructions for LLMs) are handled in the AI SDK, simplifying complex provider interfaces.

**Supported Prompt Types:**

1.  **Text Prompts:**

    - **Usage:** Passed via the `prompt` property in SDK functions (e.g., `generateText`, `streamText`).
    - **Format:** Simple JavaScript string.
    - **Best For:** Simple generation tasks, single-turn interactions.
    - **Dynamic Data:** Can use template literals (e.g., `` `Suggest activities for ${destination}...` ``).
    - **Example:** `prompt: 'Invent a new holiday...'`

2.  **System Prompts:**

    - **Usage:** Passed via the `system` property.
    - **Purpose:** Provides initial instructions or constraints to guide the model's behavior and persona.
    - **Compatibility:** Works alongside both `prompt` and `messages` properties.
    - **Alternative:** Can also be provided as the first message with `role: 'system'` in the `messages` array.
    - **Example:** `system: 'You help planning travel itineraries.'`

3.  **Message Prompts:**
    - **Usage:** Passed via the `messages` property.
    - **Format:** An array of message objects, each with `role` and `content`.
    - **Best For:** Chat interfaces, multi-turn conversations, complex multi-modal inputs.
    - **Roles:**
      - `user`: Input from the end-user.
      - `assistant`: Previous responses from the LLM.
      - `tool`: Results from tool executions.
      - `system`: Initial instructions (alternative to `system` property).
    - **Content Structure:**
      - Can be a simple string (for text-only user/assistant messages).
      - Can be an array of 'parts' for multi-modal content.
    - **Message Part Types:**
      - **User Messages:**
        - `{ type: 'text', text: '...' }`
        - `{ type: 'image', image: <InputType> }`
          - `InputType`: base64 string, data URL string, `Buffer`, `ArrayBuffer`, `Uint8Array`, URL string, `URL` object.
        - `{ type: 'file', mimeType: '...', data: <InputType>, filename?: '...' }`
          - `InputType`: base64 string, data URL string, `Buffer`, `ArrayBuffer`, `Uint8Array`, URL string, `URL` object.
          - _Provider Support Limited:_ Google, Vertex, OpenAI (wav/mp3 for gpt-4o-audio-preview, pdf), Anthropic.
      - **Assistant Messages:**
        - `{ type: 'text', text: '...' }`
        - `{ type: 'tool-call', toolCallId: '...', toolName: '...', args: {...} }` (Can have multiple in one message for parallel calls).
        - `{ type: 'file', mimeType: '...', data: <Buffer | ...> }` (For model-generated files, limited support).
      - **Tool Messages:**
        - `{ type: 'tool-result', toolCallId: '...', toolName: '...', result: {...} }` (`toolCallId` must match the corresponding `tool-call`).
        - `experimental_content: [{ type: 'text', ... }, { type: 'image', ... }]` (For multi-modal tool results, currently Anthropic only).

**Important Note:** Model/provider support for different message roles, parts (especially image/file), and multi-modal tool results varies. Check specific model capabilities.

**Next Section in Docs:** Tools

---

### 2.2 Tools (sdk.vercel.ai/docs/foundations/tools)

**Reviewed:** 2025-07-04

This section explains how Tools (also known as Function Calling) allow LLMs to invoke external actions or functions.

**Core Concept:** Tools extend LLM capabilities beyond text generation, enabling interaction with external systems (APIs, databases, UI functions, etc.).

**Defining a Tool:**

- A tool is defined as a JavaScript object passed to the `tools` parameter of `generateText` or `streamText`.
- **Structure:**
  - `description` (Optional `string`): A description to help the LLM decide when to use the tool.
  - `parameters` (`z.ZodSchema` | `JSONSchema`): Defines the input parameters the tool expects. Uses Zod schema (recommended) or raw JSON schema. The SDK uses this schema to validate the arguments generated by the LLM.
  - `execute` (Optional `async function(args): Promise<ResultType>`): An asynchronous function that takes the validated arguments (parsed according to the schema) and performs the tool's action. If provided, the SDK automatically calls this function when the LLM generates a corresponding `tool-call`.

**Tool Execution Flow:**

1.  LLM receives a prompt and the definition of available tools (including descriptions and parameter schemas).
2.  LLM decides to use a specific tool based on the prompt and tool descriptions.
3.  LLM generates a `tool-call` message part containing:
    - `toolCallId` (unique identifier for this specific call)
    - `toolName` (name matching the key in the `tools` object)
    - `args` (arguments generated by the LLM, conforming to the tool's `parameters` schema).
4.  **Automatic Execution (if `execute` is defined):**
    - The AI SDK validates the `args` against the tool's `parameters` schema.
    - The SDK calls the tool's `execute` function with the validated `args`.
    - The `execute` function returns a result.
5.  **Result Reporting:**
    - The SDK automatically creates a `tool-result` message part containing:
      - `toolCallId` (matching the original call)
      - `toolName`
      - `result` (the value returned by the `execute` function).
6.  **Multi-Step Calls (Optional):** The `tool-result` message can be automatically sent back to the LLM in a subsequent turn, allowing the LLM to use the tool's output to generate its final response.

**Schema Definition:**

- **Zod:** Recommended for defining `parameters`. Requires installing `zod` (`pnpm add zod`).
- **JSON Schema:** Can be used via the `jsonSchema` helper function.

**UI Generator Tools:**

- Used specifically with `streamUI`.
- Instead of `execute`, they have a `generate` function that can return React components.

**Toolkits & Libraries:**

- Several third-party libraries offer pre-built toolkits compatible with the AI SDK:
  - `agentic`: Collection of tools (Exa, E2B APIs).
  - `browserbase`: Headless browser tool.
  - `Stripe agent tools`: Stripe interaction.
  - `Toolhouse`: Various actions.
  - `Agent Tools`: General agent tools.
  - `Composio`: 250+ tools (GitHub, Gmail, Salesforce).
  - `Interlify`: Convert APIs to tools.
  - `Freestyle`: Execute JS/TS code.
- Utilities:
  - `AI Tool Maker`: CLI to generate tools from OpenAPI specs.

**Further Reading:** Links to AI SDK Core Tool Calling and Agents documentation for more details.

**Next Section in Docs:** Streaming

---

### 2.3 Streaming (sdk.vercel.ai/docs/foundations/streaming)

**Reviewed:** 2025-07-04

This section explains the concept and benefits of streaming responses from LLMs, especially for user interfaces.

**Problem Addressed:**

- LLMs can be slow, especially for long outputs (5-40s+).
- Traditional blocking UIs result in poor user experience due to long waits (loading spinners).

**Solution: Streaming UI:**

- Displays parts of the LLM response as they become available.
- Significantly improves perceived performance and user experience, especially in conversational apps.
- Visual examples provided comparing blocking vs. streaming UI responsiveness.

**When to Stream:**

- Highly recommended for interactive applications (chatbots, content generation) using potentially slow models.
- May not be necessary if smaller, faster models can achieve the goal without noticeable delay (simplifies development).

**AI SDK Simplification:**

- The SDK is designed to make implementing streaming UIs easy, regardless of model speed.
- Core streaming functions: `streamText` (for text and tool calls), `streamObject` (for structured data).

**Basic Example (`streamText`):**

```typescript
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const { textStream } = await streamText({
  model: openai("gpt-4-turbo"),
  prompt: "Write a poem about embedding models.",
});

// Process the stream chunk by chunk
for await (const textPart of textStream) {
  process.stdout.write(textPart); // Example: print to console
}
```

**Further Reading:** Links to Getting Started guides for practical implementation.

**Next Section in Docs:** Agents

---

### 2.4 Agents (sdk.vercel.ai/docs/foundations/agents)

**Reviewed:** 2025-07-04

This section discusses building complex AI systems (Agents) by combining fundamental AI SDK building blocks with workflow patterns.

**Core Challenge:** Balancing flexibility (LLM freedom) vs. control (constraining actions).

**Building Blocks:**

1.  **Single-Step LLM Generation:** Basic LLM call for simple tasks.
2.  **Tool Usage:** Extending LLM capabilities with defined tools.
    - **Multi-Step Tool Usage:** LLM can iteratively call tools to solve complex problems without a predefined sequence. The AI SDK simplifies this via the `maxSteps` parameter in `generateText` and `streamText`.
3.  **Multi-Agent Systems:** Multiple specialized LLMs collaborating.

**Workflow Patterns (Combining Building Blocks):**

- **Sequential Processing (Chains):** Steps executed in order. Good for well-defined sequences (e.g., generate -> evaluate -> refine).
- **Routing:** Model decides the workflow path based on context (e.g., classify query -> route to specialized prompt/model).
- **Parallel Processing:** Independent subtasks run concurrently (e.g., parallel code reviews).
- **Orchestrator-Worker:** A primary model coordinates specialized worker models (e.g., architect plans -> workers implement files).
- **Evaluator-Optimizer:** Includes evaluation steps to check quality and trigger retries or corrections (e.g., translate -> evaluate -> improve based on feedback).

**Multi-Step Tool Usage (`maxSteps`):**

- **Purpose:** For problems where the solution path isn't predefined, allowing the LLM to iteratively use tools.
- **Mechanism:** When `maxSteps` is set (e.g., `maxSteps: 10`), the SDK automatically re-invokes the LLM after each `tool-result` is available, feeding the result back into the conversation history.
- **Termination:** The loop stops when the LLM doesn't call a tool in a step, or the `maxSteps` limit is reached.
- **Example:** Math problem solver agent using a `calculate` tool iteratively.

**Structured Answers via Tools:**

- **Method:** Define a final "answer" tool with a specific schema but _no_ `execute` function.
- **Invocation:** Use `toolChoice: 'required'` in the LLM call.
- **Result:** Forces the LLM's final output to be a call to the "answer" tool, providing the result in the desired structured format.
- **Alternative:** `generateText`'s `experimental_output` setting.

**Accessing Intermediate Steps:**

- The `steps` property in the `generateText` response contains an array of all intermediate steps (LLM calls, tool calls, tool results) performed during a multi-step execution.

**Step Completion Callback:**

- The `onStepFinish` callback in `generateText` (and likely `streamText`) is triggered after each step completes, providing access to the text, tool calls/results, finish reason, and usage for that specific step.

**Considerations for Choosing Approach:**

- Flexibility vs. Control
- Error Tolerance
- Cost (more steps/agents = higher cost)
- Maintainability (simpler is easier)
- Start simple and add complexity (tools, feedback loops, multiple agents) only when necessary.

**Next Section in Docs:** Getting Started

---

## 3. Getting Started (sdk.vercel.ai/docs/getting-started)

**Reviewed:** 2025-07-04 (Overview Page)

This section provides introductory guides for using the AI SDK with specific frameworks and environments.

**Main Guides:**

- Next.js App Router
- Next.js Pages Router
- SvelteKit
- Nuxt (Vue.js)
- Node.js
- Expo

**Backend Framework Examples (Using AI SDK Core/UI):**

- Node.js HTTP Server
- Express
- Hono
- Fastify
- Nest.js

_Note: These guides likely contain practical code examples and setup instructions for each specific environment. Will not delve into each guide unless required for a specific task._

**Next Section in Docs:** Navigating the Library (Seems like a sub-section of Getting Started, will skip for now and move to AI SDK Core based on the main structure observed earlier).

---

## 4. AI SDK Core (sdk.vercel.ai/docs/ai-sdk-core)

This section details the core, framework-agnostic functionalities of the AI SDK.

### 4.1 Generating Text (sdk.vercel.ai/docs/ai-sdk-core/generating-text)

**Reviewed:** 2025-07-04

This page covers the primary functions for generating and streaming text from LLMs.

**Core Functions:**

1.  **`generateText` (Blocking):**

    - **Purpose:** Generates the full text response before returning. Ideal for non-interactive tasks (summarization, email drafting) or agent steps needing the complete result.
    - **Input Params (Common):** `model`, `prompt` (string), `system` (string), `messages` (array), `tools`, `maxSteps`, `toolChoice`, `experimental_output`, `experimental_continueSteps`.
    - **Return Value (`result`):** Object containing promises for:
      - `text`: The complete generated text.
      - `reasoning`: Model's reasoning steps (if supported).
      - `sources`: Input sources used (if supported, e.g., grounded search).
      - `finishReason`: Why generation stopped ('stop', 'length', 'tool-calls', etc.).
      - `usage`: Token usage details.
      - `response`: Raw provider response (headers, body).
      - `toolCalls`: List of tools the model requested.
      - `toolResults`: List of tool results provided to the model.
      - `steps`: Details of all intermediate steps in multi-step calls.
    - **Example:**
      ```typescript
      const { text } = await generateText({
        model: yourModel,
        prompt: "Write a recipe...",
      });
      ```

2.  **`streamText` (Streaming):**
    - **Purpose:** Streams text chunks as they are generated. Ideal for interactive UIs (chatbots) to improve perceived performance.
    - **Input Params (Common):** Similar to `generateText`, plus callbacks: `onError`, `onChunk`, `onFinish`, `experimental_transform`.
    - **Return Value (`result`):** Object containing streams and promises:
      - `textStream`: `ReadableStream<string>` & `AsyncIterable<string>` for text chunks.
      - `fullStream`: `ReadableStream<TextStreamPart>` & `AsyncIterable<TextStreamPart>` for all event types (`text-delta`, `tool-call`, `tool-result`, `finish`, `error`, etc.).
      - Promises for final values (similar to `generateText`: `text`, `finishReason`, `usage`, etc.).
      - UI Integration Helpers: `toDataStreamResponse()`, `pipeDataStreamToResponse()`, etc. (for frameworks like Next.js).
    - **Error Handling:** Errors are emitted as stream events, not thrown. Use `onError` callback for logging/handling.
      ```typescript
      onError({ error }) { console.error('Stream Error:', error); }
      ```
    - **Callbacks:**
      - `onChunk({ chunk })`: Called for each stream part (`text-delta`, `tool-call`, etc.).
      - `onFinish({ text, finishReason, usage, ... })`: Called when the entire stream completes.
    - **Backpressure:** Stream generation respects consumption rate.
    - **Example:**
      ```typescript
      const result = streamText({
        model: yourModel,
        prompt: "Invent a holiday...",
      });
      for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
      }
      ```

**Advanced Features:**

- **Stream Transformation (`experimental_transform`):**
  - Apply transformations (filter, modify, smooth) to the stream _before_ callbacks/promises resolve.
  - Use built-in `smoothStream()` or provide custom `TransformStream` functions.
  - Custom transforms receive `{ tools, stopStream }`. `stopStream()` allows early termination (e.g., for guardrails), requires simulating finish events.
  - Multiple transforms can be chained.
- **Sources:**
  - Access grounding sources (e.g., from Google search) via `result.sources` (Promise) or `source` chunks in `fullStream`.
- **Generating Long Text (`experimental_continueSteps: true`):**
  - Used with `maxSteps` to generate text exceeding single-call output limits.
  - Automatically feeds previous output back into the prompt for continuation.
  - `streamText` streams full words only in this mode.
  - May require prompt hints for the model to stop appropriately.

**Next Section in Docs:** Generating Structured Data

---

### 4.2 Generating Structured Data (sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data)

**Reviewed:** 2025-07-04

This page details functions for generating structured data (like JSON) conforming to a predefined schema, standardizing across providers.

**Core Functions:**

1.  **`generateObject` (Blocking):**

    - **Purpose:** Generates a complete, validated JavaScript object matching the provided schema.
    - **Input Params (Main):** `model`, `schema` (Zod/Valibot/JSON), `prompt`/`messages`, `output` (strategy), `mode` (generation mode), `schemaName`?, `schemaDescription`?, `experimental_repairText`?.
    - **Return Value (`result`):** `{ object }` (Promise<object>) - The validated object. Also includes `usage`, `finishReason`, `response`.
    - **Error Handling:** Throws `NoObjectGeneratedError` if generation fails (parsing/validation error). Error object contains `text`, `response`, `usage`, `cause`.
    - **Example:**
      ```typescript
      const { object } = await generateObject({
        model: yourModel,
        schema: z.object({ name: z.string(), ... }),
        prompt: 'Generate recipe.',
      });
      ```

2.  **`streamObject` (Streaming):**
    - **Purpose:** Streams the generation of a structured object, useful for interactive UIs (like Generative UI with RSC or `useObject` hook).
    - **Input Params (Main):** Similar to `generateObject`, plus `onError` callback.
    - **Return Value (`result`):**
      - `partialObjectStream`: (`ReadableStream<object>` & `AsyncIterable<object>`) Streams partial objects as they are built.
      - `elementStream` (if `output: 'array'`): Streams individual elements of the generated array.
      - Promises for final values: `object`, `usage`, `finishReason`, etc.
    - **Error Handling:** Errors emitted via stream, use `onError` callback.
    - **Example:**
      ```typescript
      const { partialObjectStream } = streamObject({ ... });
      for await (const partial of partialObjectStream) { /* update UI */ }
      ```

**Configuration Options:**

- **Schema:** Zod (recommended, `pnpm add zod`), Valibot, or JSON Schema (via `jsonSchema` helper).
- **Output Strategy (`output`):**
  - `'object'` (Default): Generate a single object.
  - `'array'`: Generate an array of objects (schema defines element type). `streamObject` provides `elementStream`.
  - `'enum'`: Generate one value from a provided `enum` array (only `generateObject`).
  - `'no-schema'`: Generate an object without schema validation.
- **Generation Mode (`mode`):**
  - `'auto'` (Default & Recommended): SDK chooses best method (Tool or JSON mode).
  - `'tool'`: Forces using Tool Calling mechanism.
  - `'json'`: Forces using JSON Mode (if provider supports), otherwise injects schema into system prompt.
  - _Provider support varies._
- **Schema Metadata (`schemaName`, `schemaDescription`):** Optional hints for the LLM (e.g., used as tool name/description in tool mode).
- **JSON Repair (`experimental_repairText`)**: Experimental async function `({ text, error }) => Promise<string>` to attempt fixing malformed JSON from the LLM before final parsing/validation.

**Using `generateText`/`streamText` for Structured Output (`experimental_output`):**

- Experimental way to get text, tool calls, _and_ structured output in one call (some models like OpenAI support this).
- Pass `experimental_output: Output.object({ schema: ... })`.
- `generateText` returns `{ experimental_output }` (Promise).
- `streamText` returns `{ experimental_partialOutputStream }` (Stream).

**Next Section in Docs:** Tool Calling

---

### 4.3 Tool Calling (sdk.vercel.ai/docs/ai-sdk-core/tool-calling)

**Reviewed:** 2025-07-04

_Note: Attempted to access this page multiple times but encountered 404 errors. Core concepts are covered in Foundations > Tools (Section 2.2). This page might contain more specific API details or examples._

---

### 4.4 Prompt Engineering (sdk.vercel.ai/docs/ai-sdk-core/prompt-engineering)

**Reviewed:** 2025-07-04

This page provides tips for writing effective prompts, especially when using tools, and debugging techniques.

**Tips for Prompts with Tools:**

- **Model Selection:** Use models strong in tool calling (e.g., GPT-4/Turbo).
- **Simplicity:** Keep the number of tools low (<= 5 recommended) and parameter schema complexity low (avoid complex Zod types like nested optionals, unions).
- **Clarity:** Use meaningful names for tools and parameters. Use Zod's `.describe("...")` for property hints.
- **Tool Description:** If tool output is unclear or dependencies exist, explain the output in the tool's `description`.
- **Examples:** Include JSON examples of tool input/output in the prompt.

**Handling Zod Schemas:**

- **Dates:** Models return date strings. Use `z.string().date()` or `z.string().datetime()` for validation and `.transform(value => new Date(value))` to convert to JS Date objects.

**Debugging Techniques:**

- **Inspect Warnings (`result.warnings`):** Check the `warnings` array in the response (`generateText`, etc.) to see if a provider silently ignored unsupported features or settings.
- **Inspect Request Body (`result.request.body`):** For providers that expose it (e.g., OpenAI), check the raw HTTP request body sent to the provider API to verify the payload.

**Next Section in Docs:** Settings

---

### 4.5 Settings (sdk.vercel.ai/docs/ai-sdk-core/settings)

**Reviewed:** 2025-07-04

This page lists common settings applicable to AI SDK Core functions (`generateText`, `streamText`, `generateObject`, etc.) to control LLM generation behavior.

**Common Settings Parameters:**

- `maxTokens` (number): Max tokens to generate.
- `temperature` (number): Controls randomness (0 = deterministic, higher = more random). Range depends on provider. Recommended to use either `temperature` or `topP`.
- `topP` (number): Nucleus sampling (0-1). Considers only tokens in the top P probability mass. Recommended to use either `temperature` or `topP`.
- `topK` (number): Samples only from the top K most likely tokens. Advanced use; `temperature` is usually sufficient.
- `presencePenalty` (number): Penalizes repeating information already in the prompt. Range depends on provider (often 0 = no penalty).
- `frequencyPenalty` (number): Penalizes repeating the same words/phrases. Range depends on provider (often 0 = no penalty).
- `stopSequences` (string[]): Sequences that, if generated, will stop the generation process. Provider limits may apply.
- `seed` (integer): Seed for random sampling. If set and supported, results become deterministic.
- `maxRetries` (number): Max number of retries on failure. Default: 2. Set to 0 to disable.
- `abortSignal` (AbortSignal): Allows cancelling the request (e.g., via user action or timeout `AbortSignal.timeout(ms)`).
- `headers` (Record<string, string>): Additional HTTP headers for the request (HTTP providers only). Useful for provider-specific info (e.g., `Prompt-Id`). Can also be set globally in provider config.

**Provider Support:**

- Not all providers support all settings. Unsupported settings will generate a warning accessible via `result.warnings`.

**Next Section in Docs:** Embeddings

---

### 4.6 Embeddings (sdk.vercel.ai/docs/ai-sdk-core/embeddings)

**Reviewed:** 2025-07-04

This page covers generating vector embeddings for text using various models.

**Core Concept:** Embeddings represent text (words, phrases) as numerical vectors in a high-dimensional space, where similar concepts are closer together.

**Core Functions:**

1.  **`embed`:**

    - **Purpose:** Generates an embedding vector for a single input value (string).
    - **Input:** `model` (embedding model instance, e.g., `openai.embedding(...)`), `value` (string).
    - **Output:** `{ embedding: number[], usage: { tokens: number } }` (Promise).
    - **Example:**
      ```typescript
      const { embedding } = await embed({
        model: openai.embedding("..."),
        value: "text",
      });
      ```

2.  **`embedMany`:**
    - **Purpose:** Generates embeddings for multiple input values (array of strings) in a single batch call.
    - **Input:** `model`, `values` (string[]).
    - **Output:** `{ embeddings: number[][], usage: { tokens: number } }` (Promise). Embeddings array order matches input `values` order.
    - **Example:**
      ```typescript
      const { embeddings } = await embedMany({ model: ..., values: ['text1', 'text2'] });
      ```

**Utility Function:**

- **`cosineSimilarity(embedding1, embedding2)`:**
  - **Purpose:** Calculates the cosine similarity between two embedding vectors (number[]).
  - **Output:** number (closer to 1 means more similar).

**Common Settings:**

- `maxRetries` (number, default: 2): Max retry attempts.
- `abortSignal` (AbortSignal): For cancellation/timeout.
- `headers` (Record<string, string>): Custom HTTP headers.

**Token Usage:**

- Both `embed` and `embedMany` return a `usage` object (`{ tokens: number }`).

**Supported Providers/Models (Examples):**

- OpenAI: `text-embedding-3-large` (3072), `text-embedding-3-small` (1536), `text-embedding-ada-002` (1536)
- Google: `text-embedding-004` (768)
- Mistral: `mistral-embed` (1024)
- Cohere: `embed-english-v3.0` (1024), `embed-multilingual-v3.0` (1024), light versions (384), v2 versions
- Bedrock: `amazon.titan-embed-text-v1` (1024), `v2:0` (1024)

**Next Section in Docs:** Image Generation

---

### 4.7 Image Generation (sdk.vercel.ai/docs/ai-sdk-core/image-generation)

**Reviewed:** 2025-07-04

_Note: This feature is marked as experimental._

This page covers generating images using dedicated image models.

**Core Function:**

- **`experimental_generateImage` (aliased as `generateImage`):**
  - **Purpose:** Generates one or more images based on a text prompt.
  - \*\*Input Params (Main):
    - `model`: Image model instance (e.g., `openai.image('dall-e-3')`).
    - `prompt` (string): Description of the desired image.
    - `n` (number, optional, default: 1): Number of images to generate. SDK handles batching based on model limits.
    - `size` (string, optional): Image dimensions ('widthxheight', e.g., '1024x1024'). Supported values depend on the model.
    - `aspectRatio` (string, optional): Aspect ratio ('width:height', e.g., '16:9'). Supported values depend on the model. Use either `size` or `aspectRatio`.
    - `seed` (number, optional): Seed for deterministic generation (if supported).
    - `providerOptions` (object, optional): Pass provider-specific settings (e.g., `{ openai: { style: 'vivid', quality: 'hd' } }`).
    - `abortSignal` (AbortSignal, optional): For cancellation/timeout.
    - `headers` (Record<string, string>, optional): Custom HTTP headers.
  - \*\*Return Value (`result`):
    - If `n=1`: `{ image: Image, warnings?: ... }` (Promise).
    - If `n>1`: `{ images: Image[], warnings?: ... }` (Promise).
    - `Image` object contains: `base64` (string), `uint8Array` (Uint8Array), `url`? (string).
  - **Error Handling:** Throws `NoImageGeneratedError` on failure (contains `responses`, `cause`).
  - **Batching Control:** Model configuration can include `maxImagesPerCall` to override default batch size for `n > 1` requests.

**Generating Images with Language Models:**

- Some multi-modal LLMs (e.g., Google `gemini-2.0-flash-exp`) can generate images as part of `generateText` output.
- Requires setting `providerOptions` (e.g., `{ google: { responseModalities: ['TEXT', 'IMAGE'] } }`).
- Images are accessible in the `result.files` array (each file has `base64`, `uint8Array`, `mimeType`).

**Supported Image Models (Examples & Providers):**

- xAI Grok: `grok-2-image`
- OpenAI: `dall-e-3`, `dall-e-2`
- Bedrock: `amazon.nova-canvas-v1:0`
- Fal AI: `flux/dev`, `fast-sdxl`, etc.
- DeepInfra: `stabilityai/sd3.5`, `FLUX` models, etc.
- Replicate: `flux-schnell`, `recraft-v3`
- Vertex: `imagen-3.0-generate-001`, `imagen-3.0-fast-generate-001`
- Fireworks: `flux` models, `playground` models, `sdxl` models
- Luma: `photon-1`, `photon-flash-1`
- Together.ai: `sdxl-base-1.0`, `FLUX` models
- _Note: Check provider docs for full list and supported sizes/ratios._

**Next Section in Docs:** Language Model Middleware

---

### 4.8 Language Model Middleware (sdk.vercel.ai/docs/ai-sdk-core/middleware)

**Reviewed:** 2025-07-04

This page explains how middleware can intercept and modify calls to language models in a model-agnostic way.

**Core Concept:** Middleware wraps a language model instance to add functionality like guardrails, RAG, caching, logging, etc., without altering the core model logic.

**Usage:**

- **`wrapLanguageModel({ model, middleware })`:** Takes an original model and one or an array of middlewares, returning a new, enhanced model instance.
- **Order:** If an array of middlewares is provided, they are applied sequentially from right to left (e.g., `[m1, m2]` becomes `m1(m2(model))`).
- The wrapped model is used directly in functions like `generateText`, `streamText`.

**Built-in Middleware:**

- **`extractReasoningMiddleware({ tagName: 'think' })`:** Extracts text within specified tags (e.g., `<think>`) and makes it available in the `result.reasoning` property. Option `startWithReasoning: true` prepends the tag (useful for models like DeepSeek R1).
- **`simulateStreamingMiddleware()`:** Simulates streaming behavior for non-streaming models.
- **`defaultSettingsMiddleware({ settings: {...} })`:** Applies default generation settings (e.g., `temperature`, `maxTokens`) to a model. _Note: Use `providerMetadata` for provider-specific options here, not `providerOptions`._

**Implementing Custom Middleware:**

- _Advanced feature requiring understanding of the Language Model Specification._
- Implement an object with one or more of these functions:
  - `transformParams({ params })`: Async function to modify parameters before calling the model (`doGenerate`/`doStream`).
  - `wrapGenerate({ doGenerate, params })`: Async function to wrap the blocking generation call. Can modify params, call original `doGenerate`, modify result.
  - `wrapStream({ doStream, params })`: Async function to wrap the streaming generation call. Can modify params, call original `doStream`, modify the returned stream.
- **Examples Provided:** Logging, Caching (simple generate, streaming complex), RAG (modifying params), Guardrails (modifying result text, streaming complex).

**Next Section in Docs:** Provider & Model Management

---

### 4.9 Provider & Model Management (sdk.vercel.ai/docs/ai-sdk-core/provider-management)

**Reviewed:** 2025-07-04

This page describes utilities for centrally managing multiple AI providers and models, allowing access via simple string IDs and pre-configuring settings.

**Core Utilities:**

1.  **`customProvider`:**

    - **Purpose:** Creates a customized wrapper around an existing provider instance.
    - **Use Cases:**
      - **Override/Set Default Model Settings:** Define specific settings for certain model IDs within this custom provider (e.g., `openai('gpt-4o', { structuredOutputs: true })`).
      - **Model Name Aliases:** Create short, memorable aliases (e.g., `'opus'`) that map to full provider model IDs (e.g., `anthropic('claude-3-opus-20240229')`), making it easy to update model versions centrally.
      - **Limit Available Models:** Explicitly define which models (`languageModels`, `embeddingModels`, `imageModels`) are exposed through this custom provider. If `fallbackProvider` is omitted, only explicitly listed models are available.
    - **Configuration:**

      ```typescript
      import { customProvider } from "ai";
      import { originalProvider } from "@ai-sdk/provider"; // e.g., openai

      const myCustomProvider = customProvider({
        languageModels: {
          "alias-or-id": originalProvider("model-id", {
            /* settings */
          }),
          // ...
        },
        embeddingModels: {
          /* ... */
        },
        imageModels: {
          /* ... */
        },
        // Optional: If ID not found above, try this provider
        fallbackProvider: originalProvider,
      });
      ```

2.  **`createProviderRegistry`:**

    - **Purpose:** Creates a registry to manage multiple providers (original or custom) under unique prefixes.
    - **Configuration:**

      ```typescript
      import { createProviderRegistry } from "ai";
      import { providerA } from "./providerA"; // Original or custom
      import { createOpenAI } from "@ai-sdk/openai"; // Can use createXyz for setup

      export const registry = createProviderRegistry(
        {
          // Key becomes the prefix
          providerA,
          openai: createOpenAI({ apiKey: "..." }),
        },
        { separator: ":" }, // Optional: Default separator is ':'
      );
      ```

    - **Accessing Models:** Use methods on the registry object with prefixed IDs:
      - `registry.languageModel('providerPrefix:modelId')`
      - `registry.textEmbeddingModel('providerPrefix:modelId')`
      - `registry.imageModel('providerPrefix:modelId')`

**Combining Concepts:**

- You can register `customProvider` instances within a `createProviderRegistry`.
- Middleware (using `wrapLanguageModel`) can be applied within a `customProvider` definition to pre-configure models with specific behaviors (e.g., default settings).
- The documentation provides a comprehensive example demonstrating aliasing, custom settings via middleware, limiting models, using fallbacks, and custom separators within a single registry setup.

**Next Section in Docs:** Error Handling

---

### 4.10 Error Handling (sdk.vercel.ai/docs/ai-sdk-core/error-handling)

**Reviewed:** 2025-07-04

This page explains how to handle errors thrown by AI SDK Core functions.

**Handling Methods:**

1.  **Regular Errors (Blocking Functions & Simple Streams):**

    - Applies to: `generateText`, `generateObject`, `embed`, `embedMany`, and simple streams (`textStream`, `partialObjectStream`, `elementStream`) where errors are thrown directly.
    - Mechanism: Use standard JavaScript `try...catch` blocks around the SDK function call and any stream iteration (`for await...of`).

2.  **Streaming Errors (`fullStream`):**

    - Applies to: Using the `fullStream` property from `streamText` or `streamObject`.
    - Mechanism:
      - Errors are emitted as specific chunks within the stream: `{ type: 'error', error: Error }`.
      - Handle these chunks within the `for await...of` loop (e.g., using a `switch` statement).
      - **Recommendation:** Still wrap the entire stream processing logic in a `try...catch` block to handle potential errors occurring outside the stream itself.

3.  **`onError` Callback (Streaming Functions):**
    - Applies to: `streamText`, `streamObject`.
    - Mechanism: Provide an `onError({ error })` callback function in the input parameters. This callback is invoked when an error occurs during streaming, and the error is _not_ thrown, preventing server crashes.

**Error Types:**

- The documentation mentions specific error types (like `NoObjectGeneratedError`, `NoImageGeneratedError`) which likely inherit from `Error` and may contain additional context (e.g., `cause`, `text`, `response`, `usage`). Refer to the specific function documentation or an Error Types reference page (if available) for details.

**Next Section in Docs:** Testing

---

### 4.11 Testing (sdk.vercel.ai/docs/ai-sdk-core/testing)

**Reviewed:** 2025-07-04

This page describes utilities provided by the AI SDK (`ai/test`) to facilitate unit testing of code that uses AI SDK Core functions, addressing the challenges of non-determinism, cost, and slowness of real LLM calls.

**Core Idea:** Use mock providers and test helpers for repeatable and deterministic testing without actual API calls.

**Test Helpers (Import from `ai/test`):**

- **`MockLanguageModelV1`:**
  - A mock language model implementation.
  - Requires providing mock implementations for `doGenerate` and/or `doStream` during instantiation.
  - `doGenerate`: Mock should return `{ text, finishReason, usage, rawCall, ... }`.
  - `doStream`: Mock should return `{ stream, rawCall, ... }`, where `stream` is typically created using `simulateReadableStream`.
  - Can set `defaultObjectGenerationMode` (e.g., `'json'`) for testing object generation.
- **`MockEmbeddingModelV1`:**
  - A mock embedding model implementation (details likely involve mocking `doEmbed`).
- **`simulateReadableStream({ chunks: [], initialDelayInMs?, chunkDelayInMs? })`:**
  - Creates a mock `ReadableStream` that emits predefined `chunks` (stream parts like `{ type: 'text-delta', ... }`, `{ type: 'finish', ... }`) with optional delays.
- **`mockId()`:**
  - Returns an incrementing integer ID (useful for mocking unique IDs like `toolCallId`).
- **`mockValues(array)`:**
  - Returns an iterator that yields elements from the input `array` sequentially, repeating the last element once the array is exhausted.

**Usage:**

- Instantiate `MockLanguageModelV1` or `MockEmbeddingModelV1` with desired mock behavior.
- Pass the mock model instance to AI SDK Core functions (`generateText`, `streamText`, `generateObject`, `streamObject`, `embed`, `embedMany`) within your unit tests.
- Assert the outputs or side effects based on the controlled mock responses.

**Simulating Data Stream Protocol:**

- The page also shows how `simulateReadableStream` can be used with `TextEncoderStream` to create a mock HTTP `Response` body that adheres to the Vercel AI Data Stream Protocol, useful for testing backend API endpoints.

**Next Section in Docs:** Telemetry

---

### 4.12 Telemetry (sdk.vercel.ai/docs/ai-sdk-core/telemetry)

**Reviewed:** 2025-07-04

_Note: This feature is marked as experimental._

This page describes the AI SDK's integration with OpenTelemetry for collecting telemetry data (spans, events, attributes) about model interactions.

**Core Concepts:**

- **Standard:** Uses OpenTelemetry for standardized observability.
- **Integration:** Works with observability providers supporting OpenTelemetry.

**Configuration:**

- **Enabling:** Pass `experimental_telemetry: { isEnabled: true, ... }` to AI SDK Core functions.
  - _Prerequisite:_ Requires setting up OpenTelemetry in the application environment (e.g., following Next.js OpenTelemetry guide).
- **Options within `experimental_telemetry`:**
  - `isEnabled` (boolean): Must be `true` to enable.
  - `recordInputs` (boolean, default: true): Record input values (prompts, messages, values)?
  - `recordOutputs` (boolean, default: true): Record output values (text, object, embeddings)?
  - `functionId` (string, optional): Identifier for the function call, included in span names/attributes.
  - `metadata` (Record<string, any>, optional): Custom key-value pairs added as attributes (`ai.telemetry.metadata.*`).
  - `tracer` (OpenTelemetry `Tracer`, optional): Provide a custom tracer instance (e.g., from a specific `TracerProvider`).

**Collected Data (Spans & Attributes):**

- The SDK creates detailed spans for each core function call (e.g., `ai.generateText`, `ai.streamText.doStream`, `ai.embed.doEmbed`, `ai.toolCall`).
- **Common Span Attributes:**
  - `operation.name`: Combines SDK operation ID and `functionId`.
  - `ai.operationId`: e.g., "ai.generateText".
  - `ai.model.id`, `ai.model.provider`.
  - `ai.prompt`/`ai.schema`/`ai.value(s)`: Input details.
  - `ai.response.text`/`object`/`toolCalls`/`embedding(s)`: Output details.
  - `ai.response.finishReason`, `ai.usage.*` (tokens).
  - `ai.settings.*` (maxRetries, maxSteps, mode, etc.).
  - `ai.telemetry.*` (functionId, metadata.\*).
  - `ai.request.headers.*`.
- **Provider Call Spans (`doGenerate`, `doStream`, `doEmbed`):** Include details like formatted messages sent to the provider, tool definitions, tool choice, stream timings (`msToFirstChunk`, `msToFinish`, `avgCompletionTokensPerSecond`).
- **Stream Events:** `ai.stream.firstChunk`, `ai.stream.finish` are recorded as events within the `doStream` span.
- **Semantic Conventions:** Spans also include attributes following OpenTelemetry GenAI conventions (e.g., `gen_ai.request.model`, `gen_ai.usage.output_tokens`).

**Next Section in Docs:** AI SDK UI (End of AI SDK Core section)

---

## 5. AI SDK UI (sdk.vercel.ai/docs/ai-sdk-ui)

This section focuses on the framework-specific hooks and utilities for building user interfaces.

### 5.1 Chatbot (sdk.vercel.ai/docs/ai-sdk-ui/chatbot)

**Reviewed:** 2025-07-04

This page details the `useChat` hook (example uses `@ai-sdk/react`) for building conversational UIs.

**Core Hook: `useChat(options)`**

- **Purpose:** Manages chat state (messages, input, status, errors), handles streaming from a backend API, and provides utilities for UI interaction.
- **Key Return Values:**
  - `messages` (Message[]): Array of chat messages. Each message has `id`, `role`, `content` (string), `createdAt`, `parts` (array, recommended for rendering), `reasoning`?, `experimental_attachments`?.
  - `input` (string): Current value of the controlled input field.
  - `handleInputChange` (function): Change handler for the controlled input.
  - `handleSubmit` (function): Submit handler for the form; sends current `input` as a user message.
  - `status` (string): Current state ('submitted', 'streaming', 'ready', 'error').
  - `error` (Error | null): Error object if a request failed.
  - `stop` (function): Aborts the current streaming response.
  - `reload` (function): Regenerates the last AI response.
  - `setInput` (function(value)): Programmatically sets the input value.
  - `append` (function(message)): Appends a message and triggers API call.
  - `setMessages` (function(messages)): Directly sets the messages array.
- **Configuration Options (`options` object passed to `useChat`):**
  - `api` (string, default: '/api/chat'): Backend endpoint URL.
  - `id` (string, optional): Unique ID for shared state across components.
  - `initialMessages` (Message[], optional): Initial messages.
  - `initialInput` (string, optional): Initial input value.
  - `onResponse` (function(response), optional): Callback when HTTP response is received.
  - `onFinish` (function(message, { usage, finishReason }), optional): Callback when AI message stream finishes.
  - `onError` (function(error), optional): Callback on fetch error.
  - `headers` (Record<string, string>, optional): Default headers for requests.
  - `body` (Record<string, any>, optional): Default additional body fields for requests.
  - `credentials` ('omit' | 'same-origin' | 'include', optional): Fetch credentials option.
  - `streamProtocol` ('data' | 'text', default: 'data'): Expected stream format from backend. 'text' mode doesn't support tools, usage, finish reasons.
  - `experimental_throttle` (number, optional, React only): Throttle UI updates (ms).
- **Configuration Options (passed to `handleSubmit`):**
  - `body` (Record<string, any>, optional): Additional body fields for _this specific_ request.
  - `headers` (Record<string, string>, optional): Headers for _this specific_ request.
  - `allowEmptySubmit` (boolean, default: false): Allow submitting empty input?
  - `experimental_attachments` (FileList | Attachment[], optional): Send files/URLs as attachments.
    - `FileList`: From file input. `image/*`, `text/*` auto-converted to message parts.
    - `Attachment[]`: `{ name?, contentType?, url }`. `image/*` URLs (incl. data URLs) auto-converted.
- **Backend API (`/api/chat/route.ts` Example):**
  - Receives `{ messages, ... }` via POST.
  - Uses `streamText` from AI SDK Core.
  - Returns response using `result.toDataStreamResponse(options)`.
  - `toDataStreamResponse` Options: `getErrorMessage`, `sendUsage`, `sendReasoning`, `sendSources`.
- **Rendering:** Recommended to iterate over `message.parts` to handle different content types (text, tool-call, tool-result, reasoning, source, file).
- **Advanced Features:** Status handling, error display/retry, message modification (`setMessages`), controlled vs uncontrolled input (`setInput`, `append`), cancellation (`stop`), regeneration (`reload`), event callbacks, request customization, attachments, reasoning/source display.

**Next Section in Docs:** Chatbot Message Persistence

---

### 5.2 Chatbot Message Persistence (sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence)

**Reviewed:** 2025-07-04

This guide demonstrates a pattern for storing and loading chat messages using `useChat` and a backend API, using a simple file-based storage example.

**Workflow:**

1.  **New Chat Creation:**
    - User visits a base chat URL (e.g., `/chat`).
    - Backend/Server Component generates a unique chat ID (`generateId` from `ai`).
    - Creates an initial empty storage record for the ID (e.g., `[id].json` with `[]`).
    - Redirects user to the chat page with the ID (e.g., `/chat/[id]`).
2.  **Loading Existing Chat:**
    - User visits `/chat/[id]`.
    - Server Component/Loader fetches the ID from URL params.
    - Loads messages from storage using the ID (`loadChat(id)` -> `Message[]`).
    - Passes the `id` and `initialMessages` to the client component using `useChat`.
3.  **Frontend (`useChat` Setup):**
    - Initialize `useChat` with the received `id` and `initialMessages`.
    - **Crucially, set `sendExtraMessageFields: true`** in `useChat` options. This ensures the frontend sends the `id` and `createdAt` fields for each message to the backend, allowing the backend to store messages in the `useChat` format directly.
4.  **Backend API (`/api/chat`):**
    - Receives `{ messages: Message[], id: string, ... }` from `useChat`.
    - Calls `streamText` with the received `messages`.
    - Uses the `onFinish({ response })` callback from `streamText`:
      - Merges the original `messages` with the AI's response messages (`response.messages`, which are `CoreMessage[]`) using `appendResponseMessages`. This helper correctly combines the two formats into a `Message[]` array.
      - Saves the complete, updated `messages` array to storage using the chat `id` (`saveChat({ id, messages: updatedMessages })`).
5.  **Message ID Generation:**
    - User message IDs are generated client-side by `useChat`.
    - AI message IDs are generated server-side by `streamText`.
    - Can customize ID format using `createIdGenerator({ prefix, size })` via `useChat`'s `generateId` option (client) and `streamText`'s `experimental_generateMessageId` option (server).
6.  **Optimization: Send Only Last Message (React Only):**
    - Use `useChat`'s `experimental_prepareRequestBody({ messages, id })` option to return only `{ message: messages[messages.length - 1], id }`.
    - Backend API must then `loadChat(id)` first, use `appendClientMessage` to add the new user message, and then pass the full history to `streamText`.
7.  **Handling Client Disconnects:**
    - Problem: If client disconnects during streaming, backend `streamText` might abort due to backpressure, preventing `onFinish` from saving the message.
    - Solution: Call `result.consumeStream()` (no `await`) immediately after `streamText` on the backend. This removes backpressure, ensuring the stream runs to completion and `onFinish` is called even if the client disconnects. The client will load the saved state upon reconnection.
    - _Note:_ Production apps might need additional state tracking (e.g., 'in progress') in storage.

**Helper Functions:**

- `generateId()`: Creates unique IDs.
- `createIdGenerator()`: Creates a custom ID generator.
- `appendResponseMessages()`: Merges original `Message[]` with `CoreMessage[]` from AI response.
- `appendClientMessage()`: Appends a single client `Message` to a `Message[]` history (used with 'send only last message' optimization).

**Next Section in Docs:** Chatbot Tool Usage

---

### 5.3 Chatbot Tool Usage (sdk.vercel.ai/docs/ai-sdk-ui/chatbot-tool-usage)

**Reviewed:** 2025-07-04

This guide explains how to integrate tool usage (function calling) into a chatbot built with `useChat`.

**Tool Types & Handling:**

1.  **Server-Side Auto-Executed Tools:**
    - Defined in backend API (`streamText` `tools` option) with an `execute` function.
    - Execution happens on the server.
    - Tool call and result are streamed to the client via the data stream protocol.
    - Client UI renders the call/result based on `message.parts` (`tool-invocation` type).
2.  **Client-Side Auto-Executed Tools:**
    - Defined in backend API (`tools` option) _without_ an `execute` function.
    - Frontend `useChat` hook implements the `onToolCall({ toolCall })` callback.
    - When the LLM requests this tool, the `tool-call` part is streamed to the client.
    - `onToolCall` is triggered; the callback executes the client-side logic and returns the result.
    - SDK automatically sends the result back to the server if needed for multi-step calls (requires `maxSteps > 1` in `useChat`).
3.  **Client-Side User-Interaction Tools:**
    - Defined in backend API (`tools` option) _without_ an `execute` function.
    - Frontend UI iterates through `message.parts`. When a `part.type === 'tool-invocation'` for this tool is encountered:
      - Check `part.toolInvocation.state`:
        - `'call'`: Render UI elements for user interaction (e.g., confirmation buttons) using `part.toolInvocation.args`.
        - `'result'`: Render the result stored in `part.toolInvocation.result`.
        - `'partial-call'` (if `toolCallStreaming: true`): Render UI indicating the tool call is being streamed.
      - On user interaction (e.g., button click), call `addToolResult({ toolCallId, result })` provided by `useChat`.
    - Once all required tool results are added via `addToolResult`, `useChat` automatically sends the updated messages (including results) back to the server for the next step (requires `maxSteps > 1` in `useChat`).

**Key `useChat` Options/Features for Tools:**

- `onToolCall`: Callback to handle client-side auto-executed tools.
- `addToolResult`: Function to submit results for client-side interaction tools.
- `maxSteps` (number, default: 1): Must be > 1 to enable automatic multi-step tool calls involving client-side results.

**Backend (`streamText`) Options for Tools:**

- `tools`: Object defining available tools (server-side tools need `execute`).
- `maxSteps`: Enables multi-step tool execution purely on the server if all tools have `execute`.
- `toolCallStreaming` (boolean, default: false): Stream partial tool call arguments.
- `toDataStreamResponse({ getErrorMessage })`: Option to customize how tool execution errors are reported to the client.

**Rendering Tool Invocations:**

- Iterate `message.parts`.
- Check for `part.type === 'tool-invocation'`.
- Use `part.toolInvocation.toolName` to identify the tool.
- Use `part.toolInvocation.state` ('call', 'result', 'partial-call') to render appropriate UI.
- Access arguments via `part.toolInvocation.args`.
- Access results via `part.toolInvocation.result`.
- Use `part.type === 'step-start'` to render visual separators between steps in multi-step calls.

**Next Section in Docs:** Generative User Interfaces

---

### 5.4 Generative User Interfaces (sdk.vercel.ai/docs/ai-sdk-ui/generative-user-interfaces)

**Reviewed:** 2025-07-04

This guide explains how to build UIs where components are dynamically rendered based on AI tool calls, going beyond simple text responses.

**Core Concept:** Connect the results of server-side tool calls (defined with `execute`) directly to specific UI components (React example provided).

**Workflow:**

1.  **Define Tool (Server-side):** Create a tool (e.g., `weatherTool`) using `createTool` from `ai`. Include `description`, `parameters` (Zod schema), and an `execute` function that fetches/simulates data and returns it.
    ```typescript
    // ai/tools.ts
    import { tool as createTool } from 'ai';
    import { z } from 'zod';
    export const weatherTool = createTool({ /* ..., */ execute: async ({ location }) => ({ weather: '...', temperature: ..., location }) });
    export const tools = { displayWeather: weatherTool };
    ```
2.  **Backend API (`/api/chat`):** Pass the `tools` object to `streamText`.
    ```typescript
    // app/api/chat/route.ts
    import { tools } from "@/ai/tools";
    const result = streamText({ /* ..., */ tools });
    return result.toDataStreamResponse();
    ```
3.  **Create UI Component (Frontend):** Build a component (e.g., `<Weather />`) that accepts the data returned by the tool's `execute` function as props.
    ```typescript
    // components/weather.tsx
    type WeatherProps = {
      temperature: number;
      weather: string;
      location: string;
    };
    export const Weather = ({
      temperature,
      weather,
      location,
    }: WeatherProps) => {
      /* render UI */
    };
    ```
4.  **Frontend Chat UI (`useChat`):**
    - Iterate through `messages` and their `message.toolInvocations` array.
    - For each `toolInvocation`:
      - Check `toolInvocation.state`.
      - If `state === 'result'`:
        - Check `toolInvocation.toolName`.
        - If it matches the tool associated with your UI component (e.g., 'displayWeather'), render the component, passing `toolInvocation.result` as props: `<Weather {...toolInvocation.result} />`.
      - If `state !== 'result'` (i.e., 'call' or 'partial-call'):
        - Render a loading state specific to the tool (e.g., "Loading weather...").

**Expansion:** Add more tools and corresponding UI components following the same pattern.

**Key Idea:** The frontend maps tool names and results (received via the data stream) to specific UI components, enabling dynamic UI generation driven by the AI's tool usage.

**Next Section in Docs:** Completion

---

### 5.5 Completion (sdk.vercel.ai/docs/ai-sdk-ui/completion)

**Reviewed:** 2025-07-04

This page details the `useCompletion` hook, designed for building UIs that handle single-turn text completion tasks (as opposed to multi-turn chat).

**Core Hook: `useCompletion(options)`**

- **Purpose:** Manages state for a text input, triggers a backend API call with the input as a prompt, streams the completion response, and provides utilities for UI interaction.
- **Key Return Values:**
  - `completion` (string): The currently streamed (partial or full) completion text.
  - `input` (string): Current value of the controlled input field.
  - `handleInputChange` (function): Change handler for the controlled input.
  - `handleSubmit` (function): Submit handler for a form; sends `input` as the prompt.
  - `isLoading` (boolean): True if waiting for or receiving the stream.
  - `error` (Error | null): Error object if the request failed.
  - `stop` (function): Aborts the current streaming completion.
  - `setInput` (function(value)): Programmatically sets the input value.
  - `complete` (function(prompt, options?)): Programmatically triggers a completion request with a given prompt.
- **Configuration Options (`options` object passed to `useCompletion`):**
  - `api` (string, default: '/api/completion'): Backend endpoint URL.
  - `id` (string, optional): Unique ID for shared state across components.
  - `initialInput` (string, optional): Initial input value.
  - `initialCompletion` (string, optional): Initial completion value.
  - `onResponse` (function(response), optional): Callback when HTTP response is received.
  - `onFinish` (function(prompt, completion), optional): Callback when completion stream finishes.
  - `onError` (function(error), optional): Callback on fetch error.
  - `headers` (Record<string, string>, optional): Default headers for requests.
  - `body` (Record<string, any>, optional): Default additional body fields for requests.
  - `credentials` ('omit' | 'same-origin' | 'include', optional): Fetch credentials option.
  - `experimental_throttle` (number, optional, React only): Throttle UI updates (ms).
- **Backend API (`/api/completion/route.ts` Example):**
  - Receives `{ prompt: string, ... }` via POST.
  - Uses AI SDK Core's `streamText` (typically just with the `prompt` parameter).
  - Returns response using `result.toDataStreamResponse()` or `result.toTextStreamResponse()`.
- **UI Implementation:**
  - Bind input field to `input` and `handleInputChange`.
  - Bind form submission to `handleSubmit`.
  - Render the `completion` string directly.
  - Use `isLoading` for loading states.
  - Use `error` for error display.
  - Use `stop` for cancellation.

**Next Section in Docs:** Object Generation

---

### 5.6 Object Generation (UI) (sdk.vercel.ai/docs/ai-sdk-ui/object-generation)

**Reviewed:** 2025-07-04

_Note: This feature (`useObject`) is marked as experimental and currently React-only._

This page details the `useObject` hook for building UIs that display structured JSON objects being streamed from the backend.

**Core Hook: `experimental_useObject` (aliased as `useObject` from `@ai-sdk/react`)**

- **Purpose:** Manages the state for a streamed object generation process, triggered by a prompt or context, and provides the partially or fully generated object for rendering.
- **Key Return Values:**
  - `object` (object | undefined): The currently streamed (partial or full) object. Needs careful handling in UI due to potential undefined/partial state during streaming.
  - `submit` (function(prompt | any)): Triggers the backend API call to start object generation.
  - `isLoading` (boolean): True if waiting for or receiving the stream.
  - `error` (Error | null): Error object if the fetch request failed.
  - `stop` (function): Aborts the current streaming object generation.
- **Configuration Options (`options` object passed to `useObject`):**
  - `api` (string): Backend endpoint URL.
  - `schema` (Zod Schema): Zod schema used to validate the _final_ generated object.
  - `initialValue` (object, optional): Initial value for the object state.
  - `onFinish` (function({ object?, error? }), optional): Callback when object generation completes. `object` is the final, validated object (or undefined if validation fails), `error` is the validation error (if any).
  - `onError` (function(error), optional): Callback on fetch error.
  - `headers` (Record<string, string>, optional): Custom headers for the request.
  - `credentials` ('omit' | 'same-origin' | 'include', optional): Fetch credentials option.
- **Backend API (`/api/notifications/route.ts` Example):**
  - Receives POST request with prompt/context.
  - Uses AI SDK Core's `streamObject` function, providing `model`, `schema`, and `prompt`/`messages`.
  - Returns the result using `result.toTextStreamResponse()`. (Note: Uses text stream response, not data stream, as the hook directly consumes the streamed object parts).
- **UI Implementation:**
  - Use `submit` to trigger generation.
  - Render the `object` state, carefully handling potentially undefined properties during streaming (e.g., `object?.notifications?.map(...)`).
  - Use `isLoading` for loading states.
  - Use `stop` for cancellation.
  - Use `error` for fetch error display (validation errors are available in `onFinish`).

**Next Section in Docs:** OpenAI Assistants

---

### 5.7 OpenAI Assistants (sdk.vercel.ai/docs/ai-sdk-ui/openai-assistants)

**Reviewed:** 2025-07-04

This page details the `useAssistant` hook for interacting with OpenAI Assistants API (or compatible APIs) and managing client state.

**Core Hook: `useAssistant(options)`** (Available in `@ai-sdk/react`, `ai/svelte`, `ai/vue`)

- **Purpose:** Handles client-side state management for conversations with an OpenAI Assistant, including message streaming, input handling, status tracking, and error reporting.
- **Key Return Values:**
  - `status` (string): The current status of the assistant interaction (e.g., 'awaiting_message', 'in_progress').
  - `messages` (Message[]): Array of messages, including special `role: 'data'` messages for custom data sent from the backend.
  - `input` (string): Current value of the user input field.
  - `handleInputChange` (function): Change handler for the controlled input.
  - `submitMessage` (function(event?, options?)): Submits the current `input` as a user message to the assistant thread.
  - `error` (Error | null): Error object if a request failed.
  - `threadId` (string | undefined): The ID of the current OpenAI Assistant thread.
  - _(Note: `append` mentioned in docs seems incorrect for this hook; `submitMessage` is used for sending.)_
- **Configuration Options (`options` object passed to `useAssistant`):**
  - `api` (string, default: '/api/assistant'): Backend endpoint URL.
  - `threadId` (string, optional): ID of an existing thread to continue.
  - `headers` (Record<string, string>, optional): Custom headers for requests.
  - `body` (Record<string, any>, optional): Additional body fields for requests.
  - `credentials` ('omit' | 'same-origin' | 'include', optional): Fetch credentials option.
- **Backend API (`/api/assistant/route.ts` Example):**
  - Requires OpenAI Node.js library (`openai`).
  - Receives `{ threadId: string | null, message: string }` via POST.
  - Creates a new thread (`openai.beta.threads.create`) if `threadId` is null.
  - Adds the user message to the thread (`openai.beta.threads.messages.create`).
  - Uses `AssistantResponse({ threadId, messageId }, async ({ forwardStream, sendDataMessage }) => { ... })` helper from `ai`:
    - Inside the callback, start the assistant run stream: `openai.beta.threads.runs.stream(threadId, { assistant_id: ... })`.
    - Call `await forwardStream(runStream)` to stream text deltas back to the client.
    - Handle `runResult.status === 'requires_action'`: Execute required tools (logic implemented by developer), collect outputs, and submit them back using `openai.beta.threads.runs.submitToolOutputsStream(threadId, runResult.id, { tool_outputs })`. Call `forwardStream` again with the new stream.
    - Use `sendDataMessage({ role: 'data', data: {...} })` to send custom structured data to the client (appears as `role: 'data'` message).
- **UI Implementation:**
  - Use `status` for loading indicators and disabling input.
  - Render `messages`: Handle `role === 'data'` specifically to display custom data structures.
  - Bind input to `input` and `handleInputChange`.
  - Bind form submission to `submitMessage`.
  - Use `error` for error display.

**Next Section in Docs:** Streaming Custom Data

---

### 5.7 OpenAI Assistants (sdk.vercel.ai/docs/ai-sdk-ui/openai-assistants)

**Reviewed:** 2025-07-04

This page details the `useAssistant` hook for building UIs that interact with the OpenAI Assistants API (v2).

**Core Hook: `useAssistant(options)`** (Available for React, Svelte, Vue)

- **Purpose:** Manages client-side state for an Assistant thread, including messages, input, run status, and errors. Handles streaming of assistant responses and tool calls.
- **Key Return Values:**
  - `status` (string): Current status of the Assistant run (e.g., 'awaiting_message', 'in_progress', 'requires_action', 'completed', 'failed').
  - `messages` (Message[]): Array of messages in the thread. Includes standard roles (`user`, `assistant`) and a special `role: 'data'` for custom structured data sent from the backend via `sendDataMessage`.
  - `input` (string): Current value of the user input field.
  - `handleInputChange` (function): Change handler for the controlled input.
  - `submitMessage` (function(event?, options?)): Submits the user's message, adding it to the thread and triggering a new run.
  - `error` (Error | null): Error object if a request failed.
  - `threadId` (string | undefined): The ID of the current Assistant thread.
- **Configuration Options (`options` object passed to `useAssistant`):**
  - `api` (string, default: '/api/assistant'): Backend endpoint URL.
  - `threadId` (string, optional): Use an existing thread ID.
  - `headers` (Record<string, string>, optional): Custom headers for requests.
  - `body` (Record<string, any>, optional): Additional body fields for requests.
  - `credentials` ('omit' | 'same-origin' | 'include', optional): Fetch credentials option.
- **Backend API (`/api/assistant/route.ts` Example):**
  - **Requires OpenAI Node.js library (`openai`).**
  - Receives `{ threadId: string | null, message: string }`.
  - Creates a thread if `threadId` is null: `openai.beta.threads.create()`.
  - Adds user message: `openai.beta.threads.messages.create(threadId, { role: 'user', content: ... })`.
  - Uses `AssistantResponse({ threadId, messageId }, async ({ forwardStream, sendDataMessage }) => { ... })` helper:
    - **Start Run & Stream Text:** Start the run stream: `openai.beta.threads.runs.stream(threadId, { assistant_id: ... })`. Call `await forwardStream(runStream)` to pipe text deltas to the client.
    - **Handle Tool Calls:** Check `runResult.status === 'requires_action'`. If true:
      - Iterate through `runResult.required_action.submit_tool_outputs.tool_calls`.
      - Parse `toolCall.function.arguments`.
      - Execute your tool logic based on `toolCall.function.name`.
      - Collect results in `tool_outputs` array: `{ tool_call_id: ..., output: '...' }`.
      - Submit tool outputs stream: `openai.beta.threads.runs.submitToolOutputsStream(threadId, runResult.id, { tool_outputs })`.
      - Call `await forwardStream()` again with the new stream to get the next response.
      - Loop until status is no longer `requires_action`.
    - **Send Custom Data:** Use `sendDataMessage({ role: 'data', data: {...} })` within the callback to send arbitrary JSON data to the client, which appears as a `role: 'data'` message.
- **UI Implementation:**
  - Use `status` for loading/disabling UI.
  - Render `messages`, handling `role: 'data'` to display custom data structures.
  - Use `input`, `handleInputChange`, `submitMessage` for user input.
  - Use `error` for error display.

**Next Section in Docs:** Streaming Custom Data (Previously 404)

---

### 5.8 Streaming Custom Data (sdk.vercel.ai/docs/ai-sdk-ui/streaming-custom-data)

**Reviewed:** 2025-07-04

_Note: Attempted to access this page multiple times but encountered 404 errors. This page likely explains how to use the `sendDataMessage` function (mentioned in the `useAssistant` section) or other mechanisms to stream custom JSON data alongside text within the Vercel AI Data Stream Protocol._

---

### 5.9 Error Handling (UI) (sdk.vercel.ai/docs/ai-sdk-ui/error-handling)

**Reviewed:** 2025-07-04

This page explains how to handle errors within the AI SDK UI Hooks (`useChat`, `useCompletion`, `useAssistant`).

**Handling Methods:**

1.  **Using the `error` State:**
    - The hooks return an `error` object (initially `null`).
    - If a fetch request fails, this object contains the `Error`.
    - Use this state to display error messages, disable inputs, or show retry buttons (using `reload` if available).
    - _Recommendation:_ Show generic error messages to users.
2.  **Custom Submit Logic:**
    - Check the `error` state before submitting.
    - If an error exists, potentially modify the message history (e.g., remove the last message using `setMessages`) before retrying the submission.
3.  **Using the `onError` Callback:**
    - Pass an `onError(error)` function in the hook's options.
    - This callback is triggered when a fetch error occurs.
    - Useful for logging, analytics, or custom side effects.
    - _Note:_ This handles fetch errors, not errors within the stream itself (use `fullStream`'s error chunk for that).
4.  **Testing Errors:**
    - Simulate errors by throwing an `Error` in the backend API route handler.

**Next Section in Docs:** Stream Protocols

---

### 5.10 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page describes the two protocols used for streaming data between the backend API and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Mechanism:** Streams plain text chunks.
- **Frontend Usage:** Set `streamProtocol: 'text'` in `useChat`/`useCompletion` options.
- **Backend Usage:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only supports basic text; cannot convey tool calls, usage data, finish reasons, custom data, etc.
- **Use Case:** Simple text completion or basic chat where only text display is needed.

**2. Data Stream Protocol (Default):**

- **Mechanism:** Uses a specific format `TYPE_ID:CONTENT_JSON\n` for each chunk, allowing various data types.
- **Frontend Usage:** Default for `useChat`/`useCompletion`. `useCompletion` only supports text (`0`) and data (`2`) parts.
- **Backend Usage:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID`):**
  - `0`: Text Part (string)
  - `g`: Reasoning Part (string)
  - `i`: Redacted Reasoning Part ({ data: string })
  - `j`: Reasoning Signature Part ({ signature: string })
  - `h`: Source Part (Source object: { sourceType, id, url, title?, providerMetadata? })
  - `k`: File Part ({ data: string (base64), mimeType: string })
  - `2`: Data Part (Array<JSONValue>) -> `message.data` / `data`
  - `8`: Message Annotation Part (Array<JSONValue>) -> `message.annotations`
  - `3`: Error Part (string) -> `error` state
  - `b`: Tool Call Streaming Start Part ({ toolCallId, toolName })
  - `c`: Tool Call Delta Part ({ toolCallId, argsTextDelta })
  - `9`: Tool Call Part ({ toolCallId, toolName, args })
  - `a`: Tool Result Part ({ toolCallId, result })
  - `f`: Start Step Part ({ messageId })
  - `e`: Finish Step Part ({ finishReason, usage, isContinued })
  - `d`: Finish Message Part ({ finishReason, usage }) - **Must be the last chunk.**
- **Use Case:** Recommended for most applications, especially those involving tool calls, custom data, or needing metadata like finish reason/usage.

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section, excluding language-specific smoothing pages)

---

### 5.10 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page details the two protocols for streaming data between backend APIs and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Format:** Plain text chunks.
- **Frontend:** Requires `streamProtocol: 'text'` option in UI hooks.
- **Backend:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only streams basic text. Cannot convey tool calls, usage, finish reasons, custom data, reasoning, sources, files, annotations, errors, or step information.
- **Use Case:** Very simple completion UIs or basic text-only chat.

**2. Data Stream Protocol (Default):**

- **Format:** Line-based protocol where each line is `TYPE_ID:CONTENT_JSON\n`.
- **Frontend:** Default for UI hooks. `useCompletion` only processes text (`0`) and data (`2`) parts.
- **Backend:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend Requirement:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID:CONTENT_JSON`):**
  - `0:string`: Text Part (appends to content)
  - `g:string`: Reasoning Part (available as `message.reasoning`)
  - `i:{"data": string}`: Redacted Reasoning Part
  - `j:{"signature": string}`: Reasoning Signature Part
  - `h:Source`: Source Part (e.g., `{ sourceType: 'url', id: '...', url: '...', title: '...' }`) -> `message.parts`
  - `k:{data:string(base64), mimeType:string}`: File Part -> `message.parts`
  - `2:Array<JSONValue>`: Data Part (custom JSON payload) -> `message.data` / `data`
  - `8:Array<JSONValue>`: Message Annotation Part -> `message.annotations`
  - `3:string`: Error Part (error message string) -> `error` state
  - `b:{toolCallId:string, toolName:string}`: Tool Call Streaming Start Part
  - `c:{toolCallId:string, argsTextDelta:string}`: Tool Call Delta Part
  - `9:{toolCallId:string, toolName:string, args:object}`: Tool Call Part (full args)
  - `a:{toolCallId:string, result:any}`: Tool Result Part
  - `f:{messageId:string}`: Start Step Part -> `message.parts`
  - `e:{finishReason, usage, isContinued}`: Finish Step Part -> `message.parts`
  - `d:{finishReason, usage}`: Finish Message Part (Must be the last chunk) -> `onFinish` callback
- **Use Case:** Recommended for most applications needing rich data transfer (tools, custom data, metadata).

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section)

---

## 6. AI SDK RSC (sdk.vercel.ai/docs/ai-sdk-rsc)

**Reviewed:** 2025-07-04 (Overview Page Only)

_Note: This entire section is marked as **experimental**. The documentation recommends using AI SDK UI for production applications._

This section focuses on utilities for integrating AI SDK features with React Server Components (RSC).

**Sub-sections (Based on Overview):**

- Overview
- Streaming React Components
- Managing Generative UI State
- Saving and Restoring States
- Multistep Interfaces
- Streaming Values
- Handling Loading State
- Error Handling
- Handling Authentication
- Migrating from RSC to UI

_Note: Due to its experimental status and the recommendation to use AI SDK UI, the detailed content of these sub-sections was not reviewed._

**Next Section in Docs:** Advanced (End of AI SDK RSC section)

---

### 5.11 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page details the two protocols used for streaming data between backend APIs and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Mechanism:** Streams plain text chunks.
- **Frontend Usage:** Set `streamProtocol: 'text'` in `useChat`/`useCompletion` options.
- **Backend Usage:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only supports basic text; cannot convey tool calls, usage data, finish reasons, custom data, reasoning, sources, files, annotations, errors, or step information.
- **Use Case:** Simple text completion or basic text-only chat.

**2. Data Stream Protocol (Default):**

- **Mechanism:** Uses a specific format `TYPE_ID:CONTENT_JSON\n` for each chunk, allowing various data types.
- **Frontend Usage:** Default for UI hooks. `useCompletion` only supports text (`0`) and data (`2`) parts.
- **Backend Usage:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend Requirement:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID:CONTENT_JSON`):**
  - `0:string`: Text Part (appends to content)
  - `g:string`: Reasoning Part (available as `message.reasoning`)
  - `i:{"data": string}`: Redacted Reasoning Part
  - `j:{"signature": string}`: Reasoning Signature Part
  - `h:Source`: Source Part (e.g., `{ sourceType: 'url', id: '...', url: '...', title: '...' }`) -> `message.parts`
  - `k:{data:string(base64), mimeType:string}`: File Part -> `message.parts`
  - `2:Array<JSONValue>`: Data Part (custom JSON payload) -> `message.data` / `data`
  - `8:Array<JSONValue>`: Message Annotation Part -> `message.annotations`
  - `3:string`: Error Part (error message string) -> `error` state
  - `b:{toolCallId:string, toolName:string}`: Tool Call Streaming Start Part
  - `c:{toolCallId:string, argsTextDelta:string}`: Tool Call Delta Part
  - `9:{toolCallId:string, toolName:string, args:object}`: Tool Call Part (full args)
  - `a:{toolCallId:string, result:any}`: Tool Result Part
  - `f:{messageId:string}`: Start Step Part -> `message.parts`
  - `e:{finishReason, usage, isContinued}`: Finish Step Part -> `message.parts`
  - `d:{finishReason, usage}`: Finish Message Part (Must be the last chunk) -> `onFinish` callback
- **Use Case:** Recommended for most applications needing rich data transfer (tools, custom data, metadata).

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section)

---

### 5.11 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page details the two protocols used for streaming data between backend APIs and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Mechanism:** Streams plain text chunks.
- **Frontend Usage:** Set `streamProtocol: 'text'` in `useChat`/`useCompletion` options.
- **Backend Usage:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only supports basic text; cannot convey tool calls, usage data, finish reasons, custom data, reasoning, sources, files, annotations, errors, or step information.
- **Use Case:** Simple text completion or basic text-only chat.

**2. Data Stream Protocol (Default):**

- **Mechanism:** Uses a specific format `TYPE_ID:CONTENT_JSON\n` for each chunk, allowing various data types.
- **Frontend Usage:** Default for UI hooks. `useCompletion` only supports text (`0`) and data (`2`) parts.
- **Backend Usage:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend Requirement:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID:CONTENT_JSON`):**
  - `0:string`: Text Part (appends to content)
  - `g:string`: Reasoning Part (available as `message.reasoning`)
  - `i:{"data": string}`: Redacted Reasoning Part
  - `j:{"signature": string}`: Reasoning Signature Part
  - `h:Source`: Source Part (e.g., `{ sourceType: 'url', id: '...', url: '...', title: '...' }`) -> `message.parts`
  - `k:{data:string(base64), mimeType:string}`: File Part -> `message.parts`
  - `2:Array<JSONValue>`: Data Part (custom JSON payload) -> `message.data` / `data`
  - `8:Array<JSONValue>`: Message Annotation Part -> `message.annotations`
  - `3:string`: Error Part (error message string) -> `error` state
  - `b:{toolCallId:string, toolName:string}`: Tool Call Streaming Start Part
  - `c:{toolCallId:string, argsTextDelta:string}`: Tool Call Delta Part
  - `9:{toolCallId:string, toolName:string, args:object}`: Tool Call Part (full args)
  - `a:{toolCallId:string, result:any}`: Tool Result Part
  - `f:{messageId:string}`: Start Step Part -> `message.parts`
  - `e:{finishReason, usage, isContinued}`: Finish Step Part -> `message.parts`
  - `d:{finishReason, usage}`: Finish Message Part (Must be the last chunk) -> `onFinish` callback
- **Use Case:** Recommended for most applications needing rich data transfer (tools, custom data, metadata).

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section)

---

### 5.11 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page details the two protocols used for streaming data between backend APIs and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Mechanism:** Streams plain text chunks.
- **Frontend Usage:** Set `streamProtocol: 'text'` in `useChat`/`useCompletion` options.
- **Backend Usage:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only supports basic text; cannot convey tool calls, usage data, finish reasons, custom data, reasoning, sources, files, annotations, errors, or step information.
- **Use Case:** Simple text completion or basic text-only chat.

**2. Data Stream Protocol (Default):**

- **Mechanism:** Uses a specific format `TYPE_ID:CONTENT_JSON\n` for each chunk, allowing various data types.
- **Frontend Usage:** Default for UI hooks. `useCompletion` only supports text (`0`) and data (`2`) parts.
- **Backend Usage:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend Requirement:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID:CONTENT_JSON`):**
  - `0:string`: Text Part (appends to content)
  - `g:string`: Reasoning Part (available as `message.reasoning`)
  - `i:{"data": string}`: Redacted Reasoning Part
  - `j:{"signature": string}`: Reasoning Signature Part
  - `h:Source`: Source Part (e.g., `{ sourceType: 'url', id: '...', url: '...', title: '...' }`) -> `message.parts`
  - `k:{data:string(base64), mimeType:string}`: File Part -> `message.parts`
  - `2:Array<JSONValue>`: Data Part (custom JSON payload) -> `message.data` / `data`
  - `8:Array<JSONValue>`: Message Annotation Part -> `message.annotations`
  - `3:string`: Error Part (error message string) -> `error` state
  - `b:{toolCallId:string, toolName:string}`: Tool Call Streaming Start Part
  - `c:{toolCallId:string, argsTextDelta:string}`: Tool Call Delta Part
  - `9:{toolCallId:string, toolName:string, args:object}`: Tool Call Part (full args)
  - `a:{toolCallId:string, result:any}`: Tool Result Part
  - `f:{messageId:string}`: Start Step Part -> `message.parts`
  - `e:{finishReason, usage, isContinued}`: Finish Step Part -> `message.parts`
  - `d:{finishReason, usage}`: Finish Message Part (Must be the last chunk) -> `onFinish` callback
- **Use Case:** Recommended for most applications needing rich data transfer (tools, custom data, metadata).

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section)

---

### 5.11 Stream Protocols (sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)

**Reviewed:** 2025-07-04

This page details the two protocols used for streaming data between backend APIs and AI SDK UI hooks (`useChat`, `useCompletion`).

**1. Text Stream Protocol:**

- **Mechanism:** Streams plain text chunks.
- **Frontend Usage:** Set `streamProtocol: 'text'` in `useChat`/`useCompletion` options.
- **Backend Usage:** Use `result.toTextStreamResponse()` after `streamText`.
- **Limitations:** Only supports basic text; cannot convey tool calls, usage data, finish reasons, custom data, reasoning, sources, files, annotations, errors, or step information.
- **Use Case:** Simple text completion or basic text-only chat.

**2. Data Stream Protocol (Default):**

- **Mechanism:** Uses a specific format `TYPE_ID:CONTENT_JSON\n` for each chunk, allowing various data types.
- **Frontend Usage:** Default for UI hooks. `useCompletion` only supports text (`0`) and data (`2`) parts.
- **Backend Usage:** Use `result.toDataStreamResponse()` after `streamText`/`streamObject`.
- **Custom Backend Requirement:** Must set HTTP header `X-Vercel-AI-Data-Stream: v1`.
- **Supported Chunk Types (`TYPE_ID:CONTENT_JSON`):**
  - `0:string`: Text Part (appends to content)
  - `g:string`: Reasoning Part (available as `message.reasoning`)
  - `i:{"data": string}`: Redacted Reasoning Part
  - `j:{"signature": string}`: Reasoning Signature Part
  - `h:Source`: Source Part (e.g., `{ sourceType: 'url', id: '...', url: '...', title: '...' }`) -> `message.parts`
  - `k:{data:string(base64), mimeType:string}`: File Part -> `message.parts`
  - `2:Array<JSONValue>`: Data Part (custom JSON payload) -> `message.data` / `data`
  - `8:Array<JSONValue>`: Message Annotation Part -> `message.annotations`
  - `3:string`: Error Part (error message string) -> `error` state
  - `b:{toolCallId:string, toolName:string}`: Tool Call Streaming Start Part
  - `c:{toolCallId:string, argsTextDelta:string}`: Tool Call Delta Part
  - `9:{toolCallId:string, toolName:string, args:object}`: Tool Call Part (full args)
  - `a:{toolCallId:string, result:any}`: Tool Result Part
  - `f:{messageId:string}`: Start Step Part -> `message.parts`
  - `e:{finishReason, usage, isContinued}`: Finish Step Part -> `message.parts`
  - `d:{finishReason, usage}`: Finish Message Part (Must be the last chunk) -> `onFinish` callback
- **Use Case:** Recommended for most applications needing rich data transfer (tools, custom data, metadata).

**Next Section in Docs:** AI SDK RSC (End of AI SDK UI section)

---

## 8. Filesystem Operations (`filesystem-mcp`)

**Mandatory Tool:** According to the Sylph Playbook guidelines, all local filesystem operations (reading, writing, listing, editing, moving, deleting, searching, etc.) **MUST** be performed using the `filesystem-mcp` tool. The built-in tools like `read_file`, `write_to_file`, `apply_diff` are considered less reliable and **SHOULD NOT** be used.

**Core Capabilities:** `filesystem-mcp` provides a comprehensive set of commands for interacting with the local filesystem, often supporting batch operations for efficiency.

**Common Commands & Usage:**

- **`list_files`**: Lists files and directories.
  - `path` (string, default: '.'): Directory path.
  - `recursive` (boolean, default: false): List recursively?
  - `include_stats` (boolean, default: false): Include detailed stats?
  - _Example:_ List files in `src/`: `{ "tool_name": "list_files", "arguments": { "path": "src" } }`
- **`read_content`**: Reads content from one or more files.
  - `paths` (string[]): Array of file paths to read.
  - _Example:_ Read `file1.txt` and `src/main.js`: `{ "tool_name": "read_content", "arguments": { "paths": ["file1.txt", "src/main.js"] } }`
- **`write_content`**: Writes or appends content to files (creates directories if needed).
  - **Use Case:** Primarily for **creating new files** or **completely overwriting** existing ones.
  - **AVOID** for modifying existing files (use `edit_file` or `apply_diff` instead).
  - `items` (array): Array of `{ path: string, content: string, append?: boolean (default: false) }` objects.
  - _Example (Create/Overwrite):_ `{ "tool_name": "write_content", "arguments": { "items": [{"path": "new_file.txt", "content": "Hello!"}] } }`
  - _Example (Append):_ `{ "tool_name": "write_content", "arguments": { "items": [{"path": "log.txt", "content": "New log entry\n", "append": true}] } }`
- **`delete_items`**: Deletes specified files or directories.
  - `paths` (string[]): Array of paths to delete.
  - _Example:_ Delete `temp.txt` and `old_dir/`: `{ "tool_name": "delete_items", "arguments": { "paths": ["temp.txt", "old_dir/"] } }`
- **`create_directories`**: Creates specified directories (including intermediate ones).
  - `paths` (string[]): Array of directory paths to create.
  - _Example:_ Create `new/nested/dir`: `{ "tool_name": "create_directories", "arguments": { "paths": ["new/nested/dir"] } }`
- **`move_items`**: Moves or renames files/directories.
  - `operations` (array): Array of `{ source: string, destination: string }` objects.
  - _Example:_ Rename `old.txt` to `new.txt`: `{ "tool_name": "move_items", "arguments": { "operations": [{"source": "old.txt", "destination": "new.txt"}] } }`
- **`copy_items`**: Copies files/directories.
  - `operations` (array): Array of `{ source: string, destination: string }` objects.
  - _Example:_ Copy `config.json` to `backup/`: `{ "tool_name": "copy_items", "arguments": { "operations": [{"source": "config.json", "destination": "backup/config.json"}] } }`
- **`search_files`**: Searches for regex patterns within files.
  - `path` (string, default: '.'): Directory to search in.
  - `regex` (string): Regex pattern.
  - `file_pattern` (string, default: '_'): Glob pattern to filter files (e.g., '_.ts').
  - _Example:_ Search for `TODO:` in all `.js` files: `{ "tool_name": "search_files", "arguments": { "path": ".", "regex": "TODO:", "file_pattern": "*.js" } }`
- **`replace_content`**: Performs simple text or regex replacements across multiple files.
  - **Use Case:** Suitable for straightforward find-and-replace tasks.
  - `paths` (string[]): Files to perform replacements on.
  - `operations` (array): Array of `{ search: string, replace: string, use_regex?: boolean, ignore_case?: boolean }` objects.
  - _Example:_ Replace 'foo' with 'bar' in `main.js`: `{ "tool_name": "replace_content", "arguments": { "paths": ["main.js"], "operations": [{"search": "foo", "replace": "bar"}] } }`
- **`edit_file`**: Performs precise, diff-like edits (insert, delete, replace) with advanced options.
  - **Use Case:** **Preferred method for modifying existing files**, especially complex changes or when indentation matters. _(See Diff/Edit Tools section for more details)_.
- **`stat_items`**: Gets detailed status info (size, type, permissions, timestamps) for multiple paths.
  - `paths` (string[]): Array of paths to get status for.
  - _Example:_ Get info for `file.txt` and `src/`: `{ "tool_name": "stat_items", "arguments": { "paths": ["file.txt", "src/"] } }`

**Batch Operations:** Many `filesystem-mcp` commands (like `read_content`, `write_content`, `delete_items`, `move_items`, `copy_items`, `replace_content`, `edit_file`, `stat_items`) accept arrays, allowing multiple operations in a single tool call for better efficiency.

---

## 9. Diff / Edit Tools

When modifying existing files, precise editing tools are crucial. The Sylph Playbook mandates using `filesystem-mcp` for reliability, but provides a fallback due to a temporary bug.

### 9.1 Preferred Tool: `filesystem-mcp edit_file`

- **Purpose:** Performs precise, diff-like edits (insert, delete, replace) on one or more files in a single call.
- **Mechanism:** Uses pattern matching (text or regex) and line numbers to target specific blocks of code for modification.
- **Features:**
  - Supports multiple changes across different files in one operation.
  - Can preserve indentation automatically.
  - Can target specific occurrences of a pattern.
  - Offers `dry_run` mode to preview changes.
  - Can output a unified diff of the changes.
- \*\*Input (`changes` array items):
  - `path` (string): File to modify.
  - `start_line` (integer): 1-based line number where search pattern starts or insertion occurs.
  - `search_pattern` (string, optional): Multi-line text or regex to find. If omitted, implies insertion at `start_line`.
  - `replace_content` (string, optional): Content to replace with. If omitted with `search_pattern`, deletes the match. Required for insertion.
  - `use_regex` (boolean, default: false): Treat `search_pattern` as regex?
  - `ignore_leading_whitespace` (boolean, default: true): Ignore leading whitespace in `search_pattern` (plain text only).
  - `preserve_indentation` (boolean, default: true): Auto-adjust indentation of `replace_content`?
  - `match_occurrence` (integer, default: 1): Which occurrence (1-based) to target?
- **Recommendation:** This is the **preferred and most robust** tool for modifying existing files due to its precision and features, as mandated by the Playbook.

### 9.2 Fallback Tool: `apply_diff` (Built-in)

- **Purpose:** Replaces specific blocks of text in a single file based on exact content match and line numbers.
- **Mechanism:** Uses a specific diff format (`<<<<<<< SEARCH ... ======= ... >>>>>>> REPLACE`) where the `SEARCH` block must _exactly_ match the existing content (including whitespace and line breaks).
- **Format:**
  ```diff
  <<<<<<< SEARCH
  :start_line:START_LINE_NUMBER
  :end_line:END_LINE_NUMBER
  -------
  EXACT CONTENT TO FIND
  =======
  NEW CONTENT TO REPLACE WITH
  >>>>>>> REPLACE
  ```
- **Multiple Edits:** Can include multiple `SEARCH/REPLACE` blocks in a single `apply_diff` call.
- **Limitations:**
  - Requires exact content match, making it brittle if the file changes slightly.
  - Less flexible than `edit_file` (no regex search, limited insertion/deletion patterns).
  - Considered less reliable by the Playbook.
- **Current Status:** Used as a **temporary fallback** only when `filesystem-mcp edit_file` encounters issues (as noted in Playbook v1.13).

**Summary:** Always prefer `filesystem-mcp edit_file` for modifications. Use `filesystem-mcp replace_content` for simple find/replace. Use the built-in `apply_diff` only as a last resort if `edit_file` fails.

---
