import { describe, it, expect, vi, beforeAll, beforeEach, type Mock } from 'vitest';
import { setLocale } from '../../../src/i18n';
import en from '../../../src/i18n/en';
import { BackupPanel, type BackupPanelDeps } from '../../../src/editor/settings/backup-panel';
import type { ChartDB } from '../../../src/store/chart-db';
import type { IStorage } from '../../../src/utils/storage';

// ── Mock modules ────────────────────────────────────────────────────────────

vi.mock('../../../src/store/backup-manager', () => ({
  createBackup: vi.fn(),
  downloadBackup: vi.fn(),
  readBackupFile: vi.fn(),
  restoreFullReplace: vi.fn(),
  restoreMerge: vi.fn(),
  getBackupSummary: vi.fn(),
}));

vi.mock('../../../src/ui/confirm-dialog', () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock('../../../src/ui/restore-dialog', () => ({
  showRestoreStrategyDialog: vi.fn(),
}));

vi.mock('../../../src/ui/toast', () => ({
  showToast: vi.fn(),
}));

vi.mock('../../../src/utils/file-type', () => ({
  detectArbolFileType: vi.fn(() => 'backup'),
}));

import {
  createBackup,
  readBackupFile,
  getBackupSummary,
  restoreFullReplace,
} from '../../../src/store/backup-manager';
import { showConfirmDialog } from '../../../src/ui/confirm-dialog';
import { showRestoreStrategyDialog } from '../../../src/ui/restore-dialog';

beforeAll(() => {
  setLocale('en', en);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function createStorage(): IStorage {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
}

function createMockChartDB(): ChartDB {
  return {
    getAllCharts: vi.fn(async () => []),
    getChart: vi.fn(),
    putChart: vi.fn(),
    deleteChart: vi.fn(),
    getVersionsByChart: vi.fn(async () => []),
    putVersion: vi.fn(),
    deleteVersion: vi.fn(),
    isChartNameTaken: vi.fn(async () => false),
    putVersionsBatch: vi.fn(),
  } as unknown as ChartDB;
}

function buildPanel(): { panel: BackupPanel; element: HTMLElement; deps: BackupPanelDeps } {
  const deps: BackupPanelDeps = {
    chartDB: createMockChartDB(),
    storage: createStorage(),
  };
  const panel = new BackupPanel(deps);
  const element = panel.build();
  return { panel, element, deps };
}

function getClearButton(element: HTMLElement): HTMLButtonElement {
  const buttons = element.querySelectorAll('button');
  for (const btn of buttons) {
    if (
      btn.getAttribute('aria-label')?.includes('Clear') ||
      btn.getAttribute('aria-label')?.includes('clear')
    ) {
      return btn;
    }
  }
  throw new Error('Clear button not found');
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('BackupPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clear all data — backup failure path', () => {
    it('shows a warning confirmation when auto-backup fails before clearing', async () => {
      const { element } = buildPanel();
      const clearBtn = getClearButton(element);

      // Make createBackup fail
      (createBackup as Mock).mockRejectedValueOnce(new Error('Backup creation failed'));

      // The first confirm dialog (warning about no backup) should block
      // unless user explicitly acknowledges. We simulate the user declining.
      (showConfirmDialog as Mock).mockResolvedValueOnce(false);

      clearBtn.click();
      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });

      // Should have been called with a message indicating backup failed
      const firstCall = (showConfirmDialog as Mock).mock.calls[0][0];
      expect(firstCall.danger).toBe(true);
      expect(firstCall.message).toMatch(/backup|failed|no backup/i);
    });

    it('does not proceed to delete when user declines after backup failure warning', async () => {
      const { element, deps } = buildPanel();
      const clearBtn = getClearButton(element);

      (createBackup as Mock).mockRejectedValueOnce(new Error('fail'));
      // User declines the warning about no backup
      (showConfirmDialog as Mock).mockResolvedValueOnce(false);

      clearBtn.click();
      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });

      // No destructive operations should have been invoked
      expect(deps.storage.removeItem).not.toHaveBeenCalled();
      // Only the warning dialog, not the actual clear confirmation
      expect(showConfirmDialog).toHaveBeenCalledTimes(1);
    });
  });

  describe('restore replace — backup failure path', () => {
    function getRestoreButton(element: HTMLElement): HTMLButtonElement {
      const buttons = element.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes('Restore')) return btn;
      }
      throw new Error('Restore button not found');
    }

    function setupFileInputCapture(): {
      getInput: () => HTMLInputElement | null;
      cleanup: () => void;
    } {
      let capturedInput: HTMLInputElement | null = null;
      const origClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
        if (this.type === 'file') {
          capturedInput = this;
        } else {
          origClick.call(this);
        }
      };
      return {
        getInput: () => capturedInput,
        cleanup: () => {
          HTMLInputElement.prototype.click = origClick;
        },
      };
    }

    function triggerFileChange(input: HTMLInputElement, fileData: unknown): void {
      const json = JSON.stringify(fileData);
      const file = new File([json], 'backup.json', { type: 'application/json' });
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
    }

    const validBackup = {
      formatVersion: 1,
      appVersion: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      data: {
        charts: [
          {
            id: 'c1',
            name: 'Test',
            workingTree: { id: 'r', name: 'R', title: 'T' },
            categories: [],
          },
        ],
        versions: [],
        settings: null,
        theme: null,
        csvMappings: null,
        customPresets: null,
        accordionState: null,
      },
    };

    it('shows a warning confirmation when auto-backup fails before replace', async () => {
      const { element } = buildPanel();
      const restoreBtn = getRestoreButton(element);
      const { getInput, cleanup } = setupFileInputCapture();

      (readBackupFile as Mock).mockResolvedValue(validBackup);
      (getBackupSummary as Mock).mockReturnValue({
        chartCount: 1,
        versionCount: 0,
        appVersion: '1.0.0',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      (showRestoreStrategyDialog as Mock).mockResolvedValue('replace');
      (createBackup as Mock).mockRejectedValueOnce(new Error('Backup creation failed'));
      (showConfirmDialog as Mock).mockResolvedValueOnce(false);

      restoreBtn.click();
      const input = getInput();
      expect(input).not.toBeNull();
      triggerFileChange(input!, validBackup);

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });

      const firstCall = (showConfirmDialog as Mock).mock.calls[0][0];
      expect(firstCall.danger).toBe(true);
      expect(firstCall.message).toMatch(/backup|failed|no backup/i);
      cleanup();
    });

    it('does not proceed to replace when user declines after backup failure warning', async () => {
      const { element } = buildPanel();
      const restoreBtn = getRestoreButton(element);
      const { getInput, cleanup } = setupFileInputCapture();

      (readBackupFile as Mock).mockResolvedValue(validBackup);
      (getBackupSummary as Mock).mockReturnValue({
        chartCount: 1,
        versionCount: 0,
        appVersion: '1.0.0',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      (showRestoreStrategyDialog as Mock).mockResolvedValue('replace');
      (createBackup as Mock).mockRejectedValueOnce(new Error('fail'));
      (showConfirmDialog as Mock).mockResolvedValueOnce(false);

      restoreBtn.click();
      const input = getInput();
      expect(input).not.toBeNull();
      triggerFileChange(input!, validBackup);

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });

      // Only the warning dialog should have been shown, not the replace confirmation
      expect(showConfirmDialog).toHaveBeenCalledTimes(1);
      // restoreFullReplace should NOT have been called
      expect(restoreFullReplace).not.toHaveBeenCalled();
      cleanup();
    });
  });
});
