import * as vscode from "vscode";
import { PanelManager } from "./webview/panelManager";
import { logger } from "./utils/logger";
import {
  COMMAND_SET_API_KEY,
  COMMAND_SHOW_PANEL,
  SECRET_API_KEY_PREFIX,
  // SUPPORTED_MODELS, // Commenting out due to persistent export/resolution issues
  CONFIG_PROVIDER,
  CONFIG_MODEL_ID,
} from "./utils/constants";
import { ProviderService } from "./ai-sdk/providerService";
import type { ProviderDetails } from "./ai-sdk/providerService";
import { initializeAiSdkModel } from "./ai-sdk/configLoader.js";

let panelManager: PanelManager | undefined;

// --- Helper Function Implementations (Moved Before Usage) ---

/**
 * Retrieves the workspace root path from the extension context.
 * Logs an error and shows a message if the path cannot be determined.
 * @param context The extension context.
 * @returns The workspace root path or undefined if not found.
 */
async function getWorkspaceRootPath(
  context: vscode.ExtensionContext,
): Promise<string | undefined> {
  const workspaceRootPath: string | undefined = context.extensionPath;
  if (workspaceRootPath) {
    logger.info(
      `Using workspace root from context.extensionPath: ${workspaceRootPath}`,
    );
    return workspaceRootPath;
  } else {
    logger.error(
      "context.extensionPath is undefined. Cannot determine workspace root.",
    );
    // Await this call now
    await vscode.window.showErrorMessage(
      "Apex Coder could not determine its installation path.",
    );
    return undefined;
  }
}

/**
 * Checks if the API key for the configured provider is present in secrets.
 * Shows a warning message with an option to set the key if it's missing.
 * @param context The extension context.
 */
async function checkApiKeyOnActivation(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration("apexCoder.ai");
    // Replace non-null assertion with check or default value
    const providerConfigKey = CONFIG_PROVIDER.split(".").pop();
    if (!providerConfigKey) {
      logger.error("Internal Error: Could not derive provider config key.");
      return;
    }
    const providerId = config.get<string>(providerConfigKey) ?? "";

    if (!providerId) {
      logger.info("No provider configured yet.");
      return;
    }

    // Fetch all providers and find the configured one
    const allProviders = await ProviderService.getAllProviders();
    const providerInfo = allProviders.find((p) => p.id === providerId);

    if (!providerInfo) {
      logger.warn(
        `Configured provider '${providerId}' not found in supported providers list.`,
      );
      return;
    }

    if (!providerInfo.requiresApiKey) {
      logger.info(
        `Provider '${providerInfo.name}' does not require an API key check on activation.`,
      );
      return;
    }

    const secretKey = `${SECRET_API_KEY_PREFIX}${providerId.toLowerCase()}`;
    logger.info(`Attempting to read secret key: ${secretKey}`);
    const apiKey = await context.secrets.get(secretKey);
    logger.info(
      `Value read for secret key ${secretKey}: ${apiKey ? "****** (found)" : "undefined (not found)"}`,
    );

    if (!apiKey) {
      logger.warn(
        `API Key for provider '${providerInfo.name}' not found in secrets. Prompting user.`,
      );
      const setupAction = "Set API Key";
      const selection = await vscode.window.showWarningMessage(
        `API Key for the configured provider '${providerInfo.name}' is missing.`,
        setupAction,
      );
      if (selection === setupAction) {
        // Await command execution if user clicks the button
        await vscode.commands.executeCommand(COMMAND_SET_API_KEY);
      }
    } else {
      logger.info(`API Key found for provider '${providerInfo.name}'.`);
    }
  } catch (error) {
    // Catch specific error types if possible, otherwise use unknown
    logger.error("Error checking API key on activation:", error);
  }
}

/**
 * Prompts the user for an API key with basic validation.
 * @param provider The selected provider information.
 * @returns The entered API key or undefined if cancelled.
 */
async function promptForApiKey(
  provider: ProviderDetails,
): Promise<string | undefined> {
  const apiKey = await vscode.window.showInputBox({
    prompt: `Enter API Key for ${provider.name}`,
    password: true,
    ignoreFocusOut: true,
    validateInput: (value: string): string | null => {
      if (!value) {
        return "API Key is required";
      }
      // Use const for provider ID
      const providerIdLower = provider.id.toLowerCase();
      switch (providerIdLower) {
        case "openai":
          if (!value.startsWith("sk-"))
            return 'OpenAI keys typically start with "sk-"';
          break;
        case "anthropic":
          if (!value.startsWith("sk-ant-"))
            return 'Anthropic keys typically start with "sk-ant-"';
          break;
        case "googleai":
          if (value.length < 30)
            return "Google AI keys are typically longer than 30 characters";
          break;
      }
      return null;
    },
  });

  if (!apiKey) {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await vscode.window.showWarningMessage(
      `API Key setup cancelled: API Key for ${provider.name} not entered.`,
    );
    return undefined;
  }
  return apiKey;
}

/**
 * Updates the VS Code configuration for the provider and model.
 * @param providerId The selected provider ID.
 * @param modelId The selected model ID (optional).
 */
async function updateConfiguration(
  providerId: string,
  modelId?: string,
): Promise<void> {
  const config = vscode.workspace.getConfiguration("apexCoder.ai");
  const updates: Promise<void>[] = [];

  // Simplify getting config keys and handle potential undefined
  const providerConfigKey = CONFIG_PROVIDER.split(".").pop();
  const modelConfigKey = CONFIG_MODEL_ID.split(".").pop();
  // const baseConfigKey = CONFIG_BASE_URL.split(".").pop(); // Assuming unused for now

  if (!providerConfigKey || !modelConfigKey) {
    logger.error("Internal Error: Could not derive config keys.");
    return;
  }

  if (config.get<string>(providerConfigKey) !== providerId) {
    updates.push(
      config.update(
        providerConfigKey,
        providerId,
        vscode.ConfigurationTarget.Global,
      ) as Promise<void>,
    );
    logger.info(`Updated provider configuration to: ${providerId}`);
  }

  if (modelId && config.get<string>(modelConfigKey) !== modelId) {
    updates.push(
      config.update(modelConfigKey, modelId, vscode.ConfigurationTarget.Global) as Promise<void>,
    );
    logger.info(`Updated model configuration to: ${modelId}`);
  } else if (!modelId && providerId.toLowerCase() === "ollama") {
    if (config.get<string>(modelConfigKey) !== undefined) {
      updates.push(
        config.update(
          modelConfigKey,
          undefined,
          vscode.ConfigurationTarget.Global,
        ) as Promise<void>,
      );
      logger.info(`Cleared model configuration for Ollama.`);
    }
  }

  await Promise.all(updates);
}

/**
 * Tests the connection to the selected provider using the provided credentials.
 * Shows progress and notification messages.
 * @param provider The selected provider.
 * @param apiKey The entered API key.
 * @param modelId The selected model ID (optional).
 */
async function testProviderConnection(
  provider: ProviderDetails,
  apiKey: string,
  modelId?: string,
): Promise<void> {
  const testResult = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Testing ${provider.name} connection...`,
      cancellable: false,
    },
    async (): Promise<boolean> => {
      // Explicit return type for arrow func
      try {
        await initializeAiSdkModel({
          provider: provider.id,
          modelId: modelId,
          credentials: {
            apiKey: apiKey,
          },
        });
        return true;
      } catch (error: unknown) {
        // Use unknown for catch
        logger.error("Connection test failed:", error);
        return false;
      }
    },
  );

  if (testResult) {
    // Await this call now
    await vscode.window.showInformationMessage(
      `Successfully connected to ${provider.name}!`,
    );
  } else {
    // Await this call now
    await vscode.window.showWarningMessage(
      `Failed to connect to ${provider.name}. Please check the API key and network connection.`,
    );
  }
}

/**
 * Handles the command to set the AI provider and API key.
 * Guides the user through selecting a provider, model, and entering the API key.
 * Stores the configuration and secret.
 * @param context The extension context.
 */
async function handleSetApiKeyCommand(
  context: vscode.ExtensionContext,
): Promise<void> {
  logger.info(`Command executed: ${COMMAND_SET_API_KEY}`);
  try {
    // 1. Select Provider
    const allProviders = await ProviderService.getAllProviders();
    const providerQuickPickItems = allProviders.map((p) => ({
      label: p.name,
      detail: p.requiresApiKey ? "Requires API key" : "No API key needed",
      value: p, // Store the whole provider object
    }));

    const selectedProviderItem = await vscode.window.showQuickPick<
      vscode.QuickPickItem & { value: ProviderDetails }
    >(providerQuickPickItems, {
      placeHolder: "Select AI Provider",
      ignoreFocusOut: true,
    });

    if (!selectedProviderItem) {
      vscode.window.showWarningMessage(
        "API Key setup cancelled: No provider selected.",
      );
      return;
    }
    const selectedProvider = selectedProviderItem.value;
    const providerIdLower = selectedProvider.id.toLowerCase();

    // 2. Select Model (if applicable and not Ollama)
    let modelValue: string | undefined = undefined;
    // Comment out usage of SUPPORTED_MODELS
    // const modelsForSelectedProvider = SUPPORTED_MODELS[providerIdLower];
    // if (providerIdLower !== "ollama" && modelsForSelectedProvider) {
    //   const modelSelection = await vscode.window.showQuickPick<
    //     vscode.QuickPickItem & { value: string }
    //   >(modelsForSelectedProvider, {
    //     placeHolder: `Select ${selectedProvider.name} Model`,
    //     ignoreFocusOut: true,
    //   });
    //
    //   if (!modelSelection) {
    //     vscode.window.showWarningMessage("Model selection cancelled");
    //     return;
    //   }
    //   modelValue = modelSelection.value;
    // }
    // Temporary: Ask for model ID manually if not Ollama, as SUPPORTED_MODELS is unavailable
    if (providerIdLower !== "ollama") {
      modelValue = await vscode.window.showInputBox({
        prompt: `Enter Model ID for ${selectedProvider.name} (e.g., gpt-4o, gemini-1.5-flash)`,
        ignoreFocusOut: true,
      });
      if (!modelValue) {
        void vscode.window.showWarningMessage(
          "Model ID input cancelled or empty.",
        );
        return;
      }
      logger.info(`Using manually entered model ID: ${modelValue}`);
    }

    // 3. Handle API Key (if required)
    let apiKey: string | undefined = undefined;
    if (selectedProvider.requiresApiKey) {
      apiKey = await promptForApiKey(selectedProvider);
      if (!apiKey) {
        return; // User cancelled
      }
      const secretKey = `${SECRET_API_KEY_PREFIX}${providerIdLower}`;
      await context.secrets.store(secretKey, apiKey);
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await vscode.window.showInformationMessage(
        `API Key for ${selectedProvider.name} stored successfully.`,
      );
      logger.info(`API Key stored for provider: ${selectedProvider.id}`);
    } else {
      logger.info(
        `Provider '${selectedProvider.name}' does not require an API key.`,
      );
      const secretKey = `${SECRET_API_KEY_PREFIX}${providerIdLower}`;
      await context.secrets.delete(secretKey);
      logger.info(
        `Removed any existing secret for keyless provider: ${selectedProvider.id}`,
      );
    }

    // 4. Update Configuration
    await updateConfiguration(selectedProvider.id, modelValue);

    // 5. Test Connection (if API key was provided)
    if (apiKey) {
      await testProviderConnection(selectedProvider, apiKey, modelValue);
    }

    // Show panel at the end - call directly, no await/void needed?
    panelManager?.showPanel();
  } catch (error: unknown) {
    const errorMsg = `Failed to set API Key: ${error instanceof Error ? error.message : String(error)}`;
    logger.error("Error setting API key:", error);
    // Await this call now
    await vscode.window.showErrorMessage(errorMsg);
  }
}

// --- Activation & Deactivation ---

/**
 * Activates the Apex Coder extension.
 * @param context The extension context.
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  logger.info("Activating Apex Coder extension...");

  const workspaceRootPath = await getWorkspaceRootPath(context);
  if (!workspaceRootPath) {
    return;
  }

  panelManager = new PanelManager(
    context,
    context.extensionMode,
    workspaceRootPath,
  );

  // Await this check
  await checkApiKeyOnActivation(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
      logger.info(`Command executed: ${COMMAND_SHOW_PANEL}`);
      panelManager?.showPanel(); // Call directly
    }),
    vscode.commands.registerCommand(
      COMMAND_SET_API_KEY,
      () =>
        // Use void for the handler as its promise isn't awaited here
        void handleSetApiKeyCommand(context), // Defined above
    ),
  );
  logger.info("Apex Coder commands registered.");

  // Automatically show panel on startup
  // Use void to explicitly ignore the promise
  void panelManager.showPanel();
  logger.info("Automatically triggered showPanel on startup.");

  logger.info("Apex Coder activation finished.");
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
  logger.info("Deactivating Apex Coder...");
  panelManager = undefined;
}
