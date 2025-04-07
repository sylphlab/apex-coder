<!-- Version: 1.0 | Last Updated: 2025-07-04 -->

# System Patterns: Apex Coder

**High-Level Architecture:**

```mermaid
graph LR
    subgraph VSCode Extension (Apex Coder)
        direction LR
        A[Vue.js Frontend (WebView)] <--> B(Extension Backend - Node.js/TS)
    end

    subgraph AI Backend
        direction LR
        C[Genkit Flows w/ Tools] --> D{Configurable AI Models}
    end

    B --> C

    subgraph VSCode
        direction TB
        E[Editor API / Settings] --> B
        F[User Interface] --> A
    end

    style VSCode fill:#f9f,stroke:#333,stroke-width:2px
    style AI Backend fill:#ccf,stroke:#333,stroke-width:2px
```

**Key Patterns:**
- **WebView UI:** Using VSCode WebView to host the Vue.js frontend, enabling rich UI capabilities.
- **Message Passing:** Relying on VSCode's `postMessage` API for communication between the WebView and the Extension Host.
- **Backend Abstraction:** Extension Host acts as a bridge and orchestrator between the frontend, VSCode API, and the Genkit backend.
- **Genkit Flows:** Encapsulating AI logic, tool definitions, and model interactions within Genkit flows.
- **Dynamic Plugin Loading:** Genkit backend dynamically loads model plugins based on user configuration in VSCode settings.
- **Tool Calling:** Implementing the agent pattern where the AI (via Genkit flow) can request actions (tools) to be performed by the Extension Host within the VSCode environment.