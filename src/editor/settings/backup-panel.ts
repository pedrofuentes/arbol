import type { ChartDB } from '../../store/chart-db';
import {
  createBackup,
  downloadBackup,
  readBackupFile,
  restoreFullReplace,
  restoreMerge,
  getBackupSummary,
} from '../../store/backup-manager';
import { showConfirmDialog } from '../../ui/confirm-dialog';
import { showRestoreStrategyDialog } from '../../ui/restore-dialog';
import { showToast } from '../../ui/toast';
import { type IStorage } from '../../utils/storage';
import { detectArbolFileType } from '../../utils/file-type';
import { t, getLocale } from '../../i18n';

const ARBOL_STORAGE_KEYS = [
  'arbol-org-data',
  'arbol-settings',
  'arbol-categories',
  'arbol-csv-mappings',
  'arbol-custom-presets',
  'arbol-theme',
];

export interface BackupPanelDeps {
  chartDB: ChartDB;
  storage: IStorage;
}

export class BackupPanel {
  private chartDB: ChartDB;
  private storage: IStorage;

  constructor(deps: BackupPanelDeps) {
    this.chartDB = deps.chartDB;
    this.storage = deps.storage;
  }

  build(): HTMLElement {
    const backupBtnGroup = document.createElement('div');
    backupBtnGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const backupBtn = document.createElement('button');
    backupBtn.className = 'btn btn-secondary';
    backupBtn.textContent = '💾 Create Backup';
    backupBtn.addEventListener('click', async () => {
      try {
        const backup = await createBackup(this.chartDB);
        downloadBackup(backup);
      } catch (e) {
        showToast(`Backup failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
      }
    });
    backupBtnGroup.appendChild(backupBtn);

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn btn-secondary';
    restoreBtn.textContent = '📂 Restore';
    restoreBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          let earlyParsed: unknown;
          try {
            earlyParsed = JSON.parse(text);
          } catch {
            earlyParsed = null;
          }
          if (earlyParsed) {
            const fileType = detectArbolFileType(earlyParsed);
            if (fileType === 'settings') {
              showToast(t('settings.wrong_file_for_restore_settings'), 'error');
              return;
            }
            if (fileType === 'chart-bundle') {
              showToast(t('settings.wrong_file_for_restore_chart'), 'error');
              return;
            }
            if (fileType === 'org-tree') {
              showToast(t('settings.wrong_file_for_restore_org'), 'error');
              return;
            }
          }

          const backup = await readBackupFile(file);
          const summary = getBackupSummary(backup);
          const date = new Date(summary.createdAt).toLocaleString(getLocale());

          const strategy = await showRestoreStrategyDialog({
            chartCount: summary.chartCount,
            versionCount: summary.versionCount,
            backupDate: date,
            appVersion: summary.appVersion,
          });

          if (strategy === 'cancel') return;

          if (strategy === 'replace') {
            // Auto-backup before destructive replace
            try {
              const autoBackup = await createBackup(this.chartDB);
              downloadBackup(autoBackup);
            } catch {
              // If auto-backup fails, still let the user proceed
            }

            const confirmed = await showConfirmDialog({
              title: 'Replace All Data',
              message:
                'This will permanently replace all existing charts, versions, and settings ' +
                'with the backup data. A backup of your current data has been downloaded.\n\n' +
                'Continue?',
              confirmLabel: 'Replace everything',
              danger: true,
            });
            if (!confirmed) return;

            await restoreFullReplace(this.chartDB, backup);
            window.location.reload();
          } else {
            const result = await restoreMerge(this.chartDB, backup);
            await showConfirmDialog({
              title: 'Merge Complete',
              message:
                `Added ${result.chartsAdded} chart(s) and ${result.versionsAdded} version(s). ` +
                `Skipped ${result.chartsSkipped} chart(s) that already existed.\n\n` +
                'The page will reload to apply changes.',
              confirmLabel: 'OK',
            });
            window.location.reload();
          }
        } catch (e) {
          showToast(`Restore failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
        }
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
    backupBtnGroup.appendChild(restoreBtn);

    // Separator before destructive action
    const separator = document.createElement('hr');
    separator.className = 'separator';
    backupBtnGroup.appendChild(separator);

    // Clear All Data button — danger styling matching the mock
    const clearDataBtn = document.createElement('button');
    clearDataBtn.className = 'btn';
    clearDataBtn.textContent = '🗑 Clear All Data';
    clearDataBtn.setAttribute('aria-label', 'Clear all local data');
    clearDataBtn.style.cssText =
      'background:rgba(244,63,94,0.1);color:var(--danger);border:1px solid rgba(244,63,94,0.2);';
    clearDataBtn.addEventListener('click', async () => {
      // Auto-backup before destructive clear
      try {
        const autoBackup = await createBackup(this.chartDB);
        downloadBackup(autoBackup);
      } catch {
        // If auto-backup fails, still allow the user to proceed
      }

      const confirmed = await showConfirmDialog({
        title: 'Clear All Data',
        message:
          'This will permanently delete all your org charts, versions, settings, themes, and preferences. ' +
          'This cannot be undone.\n\nAre you sure?',
        confirmLabel: 'Delete everything',
        danger: true,
      });
      if (confirmed) {
        for (const key of ARBOL_STORAGE_KEYS) {
          this.storage.removeItem(key);
        }
        indexedDB.deleteDatabase('arbol-db');
        window.location.reload();
      }
    });
    backupBtnGroup.appendChild(clearDataBtn);

    return backupBtnGroup;
  }
}
