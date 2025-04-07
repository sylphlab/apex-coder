<!-- Version: 1.2 | Last Updated: 2025-07-04 -->

# Technical Context: Apex Coder

**Core Technologies:**
- **VSCode Extension:** Node.js / TypeScript
- **Frontend (WebView):** Vue.js 3 (Composition API recommended), TypeScript, Vite (recommended for build)
- **AI Backend Integration:** Vercel AI SDK (using `ai` core package and provider packages like `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, community packages like `@ai-sdk/ollama` etc.) - Integrated directly into Extension Host.
- **AI Models:** Configurable via VSCode settings, leveraging Vercel AI SDK's support for numerous providers (Google, OpenAI, Anthropic, Ollama, Vertex, Mistral, Cohere, etc.).
- **Communication:**
    - WebView <-> Extension Host: VSCode `postMessage` / `onDidReceiveMessage` API.
    - Extension Host -> AI Providers: Via Vercel AI SDK.

**Development Environment:**
- Node.js (LTS version recommended)
- pnpm for package management
- VSCode for development
- `vsce` for packaging
- `yo code` for initial scaffolding

**Development Workflow:**
- VSCode F5 debugging for extension development
- Watch mode for automatic rebuilding of extension code
- Vite dev server for hot-reloading UI changes
- Launch configurations:
  - `Run Extension`: Basic extension debugging
  - `Run Extension with UI Dev Server`: Full-stack development with hot-reloading UI

**Key Libraries/APIs:**
- VSCode Extension API
- Vercel AI SDK (`ai`, `@ai-sdk/...`)
- Zod (still useful for defining structured data, e.g., for `generateObject`)
- Vue.js
- Axios (removed, direct integration now)

**Constraints & Considerations:**
- Performance: Monitor Extension Host performance with integrated Vercel AI SDK calls.
- Security: Handling API keys/credentials securely (VSCode Secrets API).
- Extensibility: Design config loader for easily adding new Vercel AI SDK providers.
- User Configuration: Allow users to easily configure AI providers, models, and API keys.