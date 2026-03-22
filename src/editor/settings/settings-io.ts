import { ChartRenderer, RendererOptions } from '../../renderer/chart-renderer';
import { addCustomPreset } from '../../store/theme-presets';
import { SettingsStore, type PersistableSettings } from '../../store/settings-store';
import { showToast } from '../../ui/toast';
import { detectArbolFileType } from '../../utils/file-type';
import { t } from '../../i18n';

export interface SettingsIOPanelDeps {
  settingsStore: SettingsStore | null;
  renderer: ChartRenderer;
  rerenderCallback: () => void;
  rebuildCallback: () => void;
}

export class SettingsIOPanel {
  private settingsStore: SettingsStore | null;
  private renderer: ChartRenderer;
  private rerenderCallback: () => void;
  private rebuildCallback: () => void;

  constructor(deps: SettingsIOPanelDeps) {
    this.settingsStore = deps.settingsStore;
    this.renderer = deps.renderer;
    this.rerenderCallback = deps.rerenderCallback;
    this.rebuildCallback = deps.rebuildCallback;
  }

  build(): HTMLElement {
    const ioBtnGroup = document.createElement('div');
    ioBtnGroup.style.cssText = 'display:flex;gap:8px;';

    const exportSettingsBtn = document.createElement('button');
    exportSettingsBtn.className = 'btn btn-secondary';
    exportSettingsBtn.style.cssText = 'flex:1;';
    exportSettingsBtn.textContent = t('settings.export');
    exportSettingsBtn.addEventListener('click', () => {
      if (this.settingsStore) {
        const currentOpts = this.renderer.getOptions();
        this.settingsStore.saveImmediate(currentOpts as Partial<PersistableSettings>);
        this.settingsStore.exportToFile('my-chart-theme');
      }
    });
    ioBtnGroup.appendChild(exportSettingsBtn);

    const importSettingsBtn = document.createElement('button');
    importSettingsBtn.className = 'btn btn-secondary';
    importSettingsBtn.style.cssText = 'flex:1;';
    importSettingsBtn.textContent = t('settings.import');
    importSettingsBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file || !this.settingsStore) return;
        if (file.size > 1 * 1024 * 1024) {
          showToast(t('settings.file_too_large'), 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const raw = JSON.parse(reader.result as string);

            const fileType = detectArbolFileType(raw);
            if (fileType === 'backup') {
              showToast(t('settings.wrong_file_for_import_settings_backup'), 'error');
              return;
            }
            if (fileType === 'chart-bundle') {
              showToast(t('settings.wrong_file_for_import_settings_chart'), 'error');
              return;
            }
            if (fileType === 'org-tree') {
              showToast(t('settings.wrong_file_for_import_settings_org'), 'error');
              return;
            }

            const currentOpts = this.renderer.getOptions();
            const settings = this.settingsStore!.importFromFile(
              reader.result as string,
              currentOpts as unknown as PersistableSettings,
            );
            this.renderer.updateOptions(settings as unknown as Partial<RendererOptions>);

            const presetName = raw.name || file.name.replace(/\.json$/i, '');
            const presetId = 'custom-' + presetName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            addCustomPreset({
              id: presetId,
              name: '⭐ ' + presetName,
              description: t('settings.imported_custom_theme'),
              colors: {
                cardFill: settings.cardFill,
                cardStroke: settings.cardStroke,
                cardStrokeWidth: settings.cardStrokeWidth,
                linkColor: settings.linkColor,
                linkWidth: settings.linkWidth,
                icContainerFill: settings.icContainerFill,
                nameColor: settings.nameColor,
                titleColor: settings.titleColor,
              },
            });

            this.rerenderCallback();
            this.rebuildCallback();
          } catch (e) {
            showToast(t('settings.import_failed', { error: e instanceof Error ? e.message : String(e) }), 'error');
          }
        };
        reader.onerror = () => {
          showToast(t('error.file_read_failed'), 'error');
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
    ioBtnGroup.appendChild(importSettingsBtn);

    return ioBtnGroup;
  }
}
