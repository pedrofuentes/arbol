/**
 * Detects the type of an Arbol JSON file by inspecting its structure.
 * Used to warn users when they pick the wrong file in the wrong context.
 */

export type ArbolFileType = 'backup' | 'settings' | 'chart-bundle' | 'org-tree' | 'unknown';

export function detectArbolFileType(parsed: unknown): ArbolFileType {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'unknown';
  }

  const obj = parsed as Record<string, unknown>;

  // Chart bundle: has format === 'arbol-chart'
  if (obj.format === 'arbol-chart') {
    return 'chart-bundle';
  }

  // Full backup: has formatVersion (number) + data object with charts/versions
  if (typeof obj.formatVersion === 'number' && typeof obj.data === 'object' && obj.data !== null) {
    return 'backup';
  }

  // Settings export: has version (number) + settings object + name/timestamp strings
  if (
    typeof obj.version === 'number' &&
    typeof obj.settings === 'object' &&
    obj.settings !== null &&
    typeof obj.name === 'string'
  ) {
    return 'settings';
  }

  // Raw OrgNode tree: has id + name + title at root level
  if (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.title === 'string'
  ) {
    return 'org-tree';
  }

  return 'unknown';
}
