export interface AppConfig {
  /** Markdown-formatted import instructions shown in the wizard and help dialog. */
  importInstructions?: string;
}

let config: AppConfig = {};

/**
 * Fetches `/arbol.config.json` and stores the result.
 * Gracefully no-ops on 404, network errors, or malformed JSON.
 */
export async function loadAppConfig(): Promise<void> {
  try {
    const response = await fetch('/arbol.config.json');
    if (!response.ok) return;

    const json = await response.json();
    if (json && typeof json === 'object') {
      config = {};
      if (typeof json.importInstructions === 'string') {
        config.importInstructions = json.importInstructions;
      }
    }
  } catch {
    // Network error or malformed JSON — keep empty config
  }
}

/** Returns the loaded app config. Empty object if not yet loaded or on error. */
export function getAppConfig(): AppConfig {
  return config;
}

/** Resets config to empty — for testing only. */
export function resetAppConfig(): void {
  config = {};
}
