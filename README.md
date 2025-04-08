# Apex Coder

A VSCode extension that provides a comprehensive, AI-powered coding assistance experience with support for multiple AI providers.

## Features

- **Multiple AI Providers**: Support for all Vercel AI SDK providers including Google AI, OpenAI, Anthropic, Ollama, and many more
- **Modern Nordic UI**: Clean, minimalist interface with high contrast, layering, and subtle animations
- **High Performance**: Optimized for speed and responsiveness
- **Flexible Configuration**: Configure your preferred AI provider and model

## Development

### Prerequisites

- Node.js (LTS version recommended)
- pnpm package manager
- VS Code

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension (or use watch mode for development):
   ```bash
   pnpm compile  # For a one-time build
   # OR
   pnpm watch    # For development with auto-rebuild
   ```

### Development Workflow

#### Using VS Code Features

The project is configured to make development easy using VS Code's built-in features:

1. **Run and Debug Extension**:
   - Press `F5` to start debugging the extension
   - This will open a new VS Code window with the extension loaded
   - In the new window, use the Command Palette (`Ctrl+Shift+P`) and run "Apex Coder: Show Panel"
2. **Launch Configurations**:

   - `Run Extension`: Basic extension debugging with automatic panel opening
   - `Run Extension with UI Dev Server`: Runs both the extension and UI development server
   - `Full Development Environment`: Complete development setup

3. **Tasks**:
   - `pnpm: watch`: Watch for changes in the extension code
   - `Start Webview UI Dev Server`: Start the UI development server with hot-reloading
   - `Start Full Dev Environment`: Start both extension watching and UI server
   - `Run: Show Panel`: Open the extension panel

#### Recommended Development Workflow

The recommended way to develop this extension is using VS Code's built-in debugging features:

1. **Open the project in VS Code**
2. **Choose a launch configuration**:

   - `Run Extension`: For basic extension debugging
   - `Run Extension with UI Dev Server`: For full-stack development with hot-reloading UI

3. **Press F5** to start debugging

   - This will start the appropriate tasks and launch a new VS Code window with the extension
   - The extension panel will automatically open in the new window

4. **Make changes to the code**
   - With the watch mode active, changes to the extension code will be automatically compiled
   - You'll need to reload the extension to see the changes (Ctrl+R in the debug window)
   - Changes to the webview UI will be automatically applied if you're using the UI Dev Server

### Installing Additional Providers

To install additional Vercel AI SDK providers:

```bash
pnpm install-providers
```

Or to install specific providers:

```bash
pnpm install-providers --providers=cohere,mistral,groq
```

## Building and Packaging

To build the extension for production:

```bash
pnpm package
```

This will create a VSIX file that can be installed in VS Code.

# apex-coder README

This is the README for your extension "apex-coder". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

- `myExtension.enable`: Enable/disable this extension.
- `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
