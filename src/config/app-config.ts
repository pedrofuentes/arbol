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
    if (response.status === 404) return;
    if (!response.ok) {
      console.warn(`[arbol] Failed to load config: HTTP ${response.status}`);
      return;
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      console.warn('[arbol] Failed to parse arbol.config.json: invalid JSON');
      return;
    }

    if (json && typeof json === 'object') {
      config = {};
      if (typeof (json as Record<string, unknown>).importInstructions === 'string') {
        config.importInstructions = (json as Record<string, unknown>).importInstructions as string;
      }
    }
  } catch {
    // Network error — keep empty config
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
