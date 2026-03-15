import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { SettingsModal } from '../../src/ui/settings-modal';

beforeAll(() => { setLocale('en', en); });

function createModal() {
  const onClose = vi.fn();
  const onApply = vi.fn();
  const modal = new SettingsModal({ onClose, onApply });
  return { modal, onClose, onApply };
}

describe('SettingsModal', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('is hidden by default', () => {
    const { modal } = createModal();
    expect(modal.isOpen()).toBe(false);
    modal.destroy();
  });

  it('open() shows overlay', () => {
    const { modal } = createModal();
    modal.open();
    expect(modal.isOpen()).toBe(true);
    expect(document.querySelector('.settings-modal-overlay.open')).not.toBeNull();
    modal.destroy();
  });

  it('close() hides overlay and calls onClose', () => {
    const { modal, onClose } = createModal();
    modal.open();
    modal.close();
    expect(modal.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    modal.destroy();
  });

  it('close button closes modal and calls onCancel', () => {
    const onCancel = vi.fn();
    const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn(), onCancel });
    modal.open();
    const closeBtn = document.querySelector('.settings-modal-close') as HTMLElement;
    closeBtn.click();
    expect(modal.isOpen()).toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);
    modal.destroy();
  });

  it('overlay click closes modal', () => {
    const { modal } = createModal();
    modal.open();
    const overlay = document.querySelector('.settings-modal-overlay') as HTMLElement;
    overlay.click();
    expect(modal.isOpen()).toBe(false);
    modal.destroy();
  });

  it('Escape key closes modal', () => {
    const { modal } = createModal();
    modal.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.isOpen()).toBe(false);
    modal.destroy();
  });

  it('Cancel button closes modal', () => {
    const { modal, onClose } = createModal();
    modal.open();
    const cancelBtn = document.querySelector('.settings-cancel-btn') as HTMLElement;
    cancelBtn.click();
    expect(onClose).toHaveBeenCalled();
    modal.destroy();
  });

  it('Apply button calls onApply and closes', async () => {
    const { modal, onClose } = createModal();
    modal.open();
    const applyBtn = document.querySelector('.settings-apply-btn') as HTMLElement;
    applyBtn.click();
    await Promise.resolve();
    expect(onClose).toHaveBeenCalled();
    modal.destroy();
  });

  it('renders 10 tabs', () => {
    const { modal } = createModal();
    modal.open();
    const tabs = document.querySelectorAll('.settings-nav-item');
    expect(tabs.length).toBe(10);
    modal.destroy();
  });

  it('first tab is active by default', () => {
    const { modal } = createModal();
    modal.open();
    expect(modal.getActiveTab()).toBe('presets');
    const tabs = document.querySelectorAll('.settings-nav-item');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    modal.destroy();
  });

  it('clicking tab switches active', () => {
    const { modal } = createModal();
    modal.open();
    const tabs = document.querySelectorAll('.settings-nav-item');
    (tabs[2] as HTMLElement).click();
    expect(modal.getActiveTab()).toBe('typography');
    expect(tabs[2].classList.contains('active')).toBe(true);
    expect(tabs[0].classList.contains('active')).toBe(false);
    modal.destroy();
  });

  it('setActiveTab updates tab state', () => {
    const { modal } = createModal();
    modal.open();
    modal.setActiveTab('cards');
    expect(modal.getActiveTab()).toBe('cards');
    modal.destroy();
  });

  it('content area has data-active-tab attribute', () => {
    const { modal } = createModal();
    modal.open();
    const content = document.querySelector('.settings-content') as HTMLElement;
    expect(content.getAttribute('data-active-tab')).toBe('presets');
    modal.setActiveTab('layout');
    expect(content.getAttribute('data-active-tab')).toBe('layout');
    modal.destroy();
  });

  it('getContentArea returns settings-content element', () => {
    const { modal } = createModal();
    modal.open();
    const area = modal.getContentArea();
    expect(area.classList.contains('settings-content')).toBe(true);
    modal.destroy();
  });

  it('has role="dialog" and aria-modal', () => {
    const { modal } = createModal();
    modal.open();
    const dialog = document.querySelector('.settings-modal');
    expect(dialog!.getAttribute('role')).toBe('dialog');
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    modal.destroy();
  });

  it('has tablist with role="tablist"', () => {
    const { modal } = createModal();
    modal.open();
    const nav = document.querySelector('.settings-nav');
    expect(nav!.getAttribute('role')).toBe('tablist');
    modal.destroy();
  });

  it('tabs have role="tab"', () => {
    const { modal } = createModal();
    modal.open();
    const tabs = document.querySelectorAll('.settings-nav-item');
    tabs.forEach(tab => {
      expect(tab.getAttribute('role')).toBe('tab');
    });
    modal.destroy();
  });

  it('content has role="tabpanel"', () => {
    const { modal } = createModal();
    modal.open();
    const content = document.querySelector('.settings-content');
    expect(content!.getAttribute('role')).toBe('tabpanel');
    modal.destroy();
  });

  it('destroy removes overlay', () => {
    const { modal } = createModal();
    modal.open();
    modal.destroy();
    expect(document.querySelector('.settings-modal-overlay')).toBeNull();
  });

  describe('cancel behavior', () => {
    it('Cancel button calls onCancel callback', () => {
      const onCancel = vi.fn();
      const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn(), onCancel });
      modal.open();
      const cancelBtn = document.querySelector('.settings-cancel-btn') as HTMLElement;
      cancelBtn.click();
      expect(onCancel).toHaveBeenCalledTimes(1);
      modal.destroy();
    });

    it('Escape key calls onCancel callback', () => {
      const onCancel = vi.fn();
      const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn(), onCancel });
      modal.open();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onCancel).toHaveBeenCalledTimes(1);
      modal.destroy();
    });

    it('overlay click calls onCancel callback', () => {
      const onCancel = vi.fn();
      const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn(), onCancel });
      modal.open();
      const overlay = document.querySelector('.settings-modal-overlay') as HTMLElement;
      overlay.click();
      expect(onCancel).toHaveBeenCalledTimes(1);
      modal.destroy();
    });

    it('Apply button does NOT call onCancel', () => {
      const onCancel = vi.fn();
      const modal = new SettingsModal({ onClose: vi.fn(), onApply: vi.fn(), onCancel });
      modal.open();
      const applyBtn = document.querySelector('.settings-apply-btn') as HTMLElement;
      applyBtn.click();
      expect(onCancel).not.toHaveBeenCalled();
      modal.destroy();
    });
  });

  describe('tab badges', () => {
    it('updateTabBadge adds .settings-tab-badge to the correct tab', () => {
      const { modal } = createModal();
      modal.open();
      modal.updateTabBadge('layout', 3);
      const layoutTab = document.querySelector('[data-tab="layout"]')!;
      const badge = layoutTab.querySelector('.settings-tab-badge');
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe('3');
      modal.destroy();
    });

    it('updateTabBadge with 0 removes the badge', () => {
      const { modal } = createModal();
      modal.open();
      modal.updateTabBadge('layout', 5);
      let badge = document.querySelector('[data-tab="layout"] .settings-tab-badge');
      expect(badge).not.toBeNull();

      modal.updateTabBadge('layout', 0);
      badge = document.querySelector('[data-tab="layout"] .settings-tab-badge');
      expect(badge).toBeNull();
      modal.destroy();
    });

    it('badge shows correct count text', () => {
      const { modal } = createModal();
      modal.open();
      modal.updateTabBadge('cards', 42);
      const badge = document.querySelector('[data-tab="cards"] .settings-tab-badge');
      expect(badge).not.toBeNull();
      expect(badge!.textContent).toBe('42');
      modal.destroy();
    });
  });

  describe('footer structure', () => {
    it('footer contains .settings-footer-left and .settings-footer-right', () => {
      const { modal } = createModal();
      modal.open();
      const footerLeft = document.querySelector('.settings-footer-left');
      const footerRight = document.querySelector('.settings-footer-right');
      expect(footerLeft).not.toBeNull();
      expect(footerRight).not.toBeNull();
      modal.destroy();
    });

    it('getFooterLeft() returns the left footer element', () => {
      const { modal } = createModal();
      modal.open();
      const footerLeft = modal.getFooterLeft();
      expect(footerLeft).not.toBeNull();
      expect(footerLeft.classList.contains('settings-footer-left')).toBe(true);
      modal.destroy();
    });
  });

  describe('live preview strip', () => {
    it('renders preview strip with header, title, hint, and area', () => {
      const { modal } = createModal();
      modal.open();
      const strip = document.querySelector('.preview-strip');
      expect(strip).not.toBeNull();
      expect(strip!.querySelector('.preview-header')).not.toBeNull();
      expect(strip!.querySelector('.preview-title')).not.toBeNull();
      expect(strip!.querySelector('.preview-hint')).not.toBeNull();
      expect(strip!.querySelector('.preview-area')).not.toBeNull();
      modal.destroy();
    });

    it('preview title shows "Live Preview"', () => {
      const { modal } = createModal();
      modal.open();
      const title = document.querySelector('.preview-title')!;
      expect(title.textContent).toBe('Live Preview');
      modal.destroy();
    });

    it('preview hint shows default presets hint', () => {
      const { modal } = createModal();
      modal.open();
      const hint = document.querySelector('.preview-hint')!;
      expect(hint.textContent).toBe('Updates as you change settings');
      modal.destroy();
    });

    it('preview strip is visible by default (presets tab)', () => {
      const { modal } = createModal();
      modal.open();
      const strip = document.querySelector('.preview-strip') as HTMLElement;
      expect(strip.classList.contains('hidden')).toBe(false);
      modal.destroy();
    });

    it('preview strip is hidden when switching to backup tab', () => {
      const { modal } = createModal();
      modal.open();
      modal.setActiveTab('backup');
      const strip = document.querySelector('.preview-strip') as HTMLElement;
      expect(strip.classList.contains('hidden')).toBe(true);
      modal.destroy();
    });

    it('preview strip reappears when switching away from backup', () => {
      const { modal } = createModal();
      modal.open();
      modal.setActiveTab('backup');
      modal.setActiveTab('layout');
      const strip = document.querySelector('.preview-strip') as HTMLElement;
      expect(strip.classList.contains('hidden')).toBe(false);
      modal.destroy();
    });

    it('hint text updates per tab', () => {
      const { modal } = createModal();
      modal.open();
      const hint = document.querySelector('.preview-hint') as HTMLElement;

      modal.setActiveTab('layout');
      expect(hint.textContent).toBe('Spacing regions highlighted');

      modal.setActiveTab('typography');
      expect(hint.textContent).toBe('Text styling highlighted');

      modal.setActiveTab('cards');
      expect(hint.textContent).toBe('Card appearance highlighted');

      modal.setActiveTab('connectors');
      expect(hint.textContent).toBe('Line styles highlighted');

      modal.setActiveTab('ic');
      expect(hint.textContent).toBe('Individual contributor layout');

      modal.setActiveTab('advisors');
      expect(hint.textContent).toBe('Advisor spacing highlighted');

      modal.setActiveTab('badges');
      expect(hint.textContent).toBe('Badge styling shown on cards');

      modal.setActiveTab('categories');
      expect(hint.textContent).toBe('How categories appear on cards');

      modal.destroy();
    });

    it('getPreviewArea() returns the .preview-area element', () => {
      const { modal } = createModal();
      modal.open();
      const area = modal.getPreviewArea();
      expect(area).not.toBeNull();
      expect(area.classList.contains('preview-area')).toBe(true);
      modal.destroy();
    });

    it('setPreviewHint() updates hint text', () => {
      const { modal } = createModal();
      modal.open();
      modal.setPreviewHint('Custom hint text');
      const hint = document.querySelector('.preview-hint') as HTMLElement;
      expect(hint.textContent).toBe('Custom hint text');
      modal.destroy();
    });

    it('preview strip is inside .settings-content-column wrapper', () => {
      const { modal } = createModal();
      modal.open();
      const column = document.querySelector('.settings-content-column');
      expect(column).not.toBeNull();
      expect(column!.querySelector('.preview-strip')).not.toBeNull();
      expect(column!.querySelector('.settings-content')).not.toBeNull();
      modal.destroy();
    });

    it('preview area is initially empty', () => {
      const { modal } = createModal();
      modal.open();
      const area = modal.getPreviewArea();
      expect(area.children.length).toBe(0);
      modal.destroy();
    });

    it('renders zoom controls in preview header', () => {
      const { modal } = createModal();
      modal.open();
      const controls = document.querySelector('.preview-controls');
      expect(controls).not.toBeNull();
      expect(controls!.querySelectorAll('.preview-zoom-btn').length).toBe(2);
      expect(controls!.querySelector('.preview-zoom-pct')).not.toBeNull();
      modal.destroy();
    });

    it('getPreviewFitBtn() returns fit button', () => {
      const { modal } = createModal();
      modal.open();
      const btn = modal.getPreviewFitBtn();
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('preview-zoom-btn')).toBe(true);
      modal.destroy();
    });

    it('getPreviewResetBtn() returns reset button', () => {
      const { modal } = createModal();
      modal.open();
      const btn = modal.getPreviewResetBtn();
      expect(btn).not.toBeNull();
      expect(btn.classList.contains('preview-zoom-btn')).toBe(true);
      modal.destroy();
    });

    it('getPreviewZoomPct() returns percentage element', () => {
      const { modal } = createModal();
      modal.open();
      const pct = modal.getPreviewZoomPct();
      expect(pct).not.toBeNull();
      expect(pct.textContent).toBe('100%');
      modal.destroy();
    });
  });
});
