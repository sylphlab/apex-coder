<!-- Version: 1.0 | Last Updated: 2025-07-04 -->

# Active Context: Apex Coder

**Current Status:** Project initiation phase. Initial planning complete.

**MAJOR PIVOT:** Switched backend AI library from Google Genkit to **Vercel AI SDK**.

**Current Status:** Foundational structure (Extension, WebView) complete. Basic communication tested. Project structure moved to root. Genkit integration attempt abandoned.

**Focus:** Refactoring the project to use Vercel AI SDK.

**Immediate Next Steps (Refactoring Plan):**\n1.  ✅ Remove Genkit dependencies and code artifacts.\n2.  ✅ Install Vercel AI SDK core (`ai`) and necessary provider packages.\n3.  ✅ Implement a new configuration loader (`src/ai-sdk/configLoader.ts`) for Vercel AI SDK providers.\n4.  ✅ Refactor `src/extension.ts` to initialize and use Vercel AI SDK.\n5.  ✅ Refactor `webview-ui/src/App.vue` for new interaction patterns.\n6.  ✅ Update build/config files (`package.json`, `tsconfig.json`).\n\n**Next Action:** Test the refactored Vercel AI SDK integration. This includes:\n    - Setting VS Code configuration (`apexCoder.ai.provider`, `apexCoder.ai.modelId`, etc.).\n    - Setting the API key for the chosen provider using the `Apex Coder: Set API Key...` command.\n    - Running the extension (F5) and testing the 'Check Status' and chat functionality in the WebView panel.

**Decisions Made:**
- Project Name: Apex Coder
- Core Tech Stack: VSCode Ext (TS), Vue.js (WebView), **Vercel AI SDK (Integrated)**
- MVP Focus: Chat Agent, Streaming, Tool Calling (Vercel AI SDK equivalent), Flexible Config, Checkpointing (Vercel AI SDK equivalent).
- Integration Approach: Integrate Vercel AI SDK directly into Extension Host (方案 A).

**Open Questions/Risks:**
- Performance of Vercel AI SDK within Extension Host.
- Handling diverse provider configurations dynamically with Vercel AI SDK.
- Secure credential handling with Vercel AI SDK.