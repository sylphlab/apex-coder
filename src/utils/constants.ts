/**
 * Extension-wide constants.
 */
export const EXTENSION_ID = "apexCoder"; // Use camelCase to match package.json registration
export const PANEL_ID = "apexCoderPanel";
export const PANEL_TITLE = "Apex Coder";

// Commands
export const COMMAND_SHOW_PANEL = `${EXTENSION_ID}.showPanel`;
export const COMMAND_SET_API_KEY = `${EXTENSION_ID}.setApiKey`;

// Configuration keys
export const CONFIG_NAMESPACE = `${EXTENSION_ID}.ai`;
export const CONFIG_PROVIDER = `${CONFIG_NAMESPACE}.provider`;
export const CONFIG_MODEL_ID = `${CONFIG_NAMESPACE}.modelId`;
export const CONFIG_BASE_URL = `${CONFIG_NAMESPACE}.baseUrl`;

// Secret keys prefix (lowercase provider name appended)
export const SECRET_API_KEY_PREFIX = `${EXTENSION_ID}.apiKey.`;
