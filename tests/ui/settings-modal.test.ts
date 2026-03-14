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

  it('close button closes modal', () => {
    const { modal, onClose } = createModal();
    modal.open();
    const closeBtn = document.querySelector('.settings-modal-close') as HTMLElement;
    closeBtn.click();
    expect(modal.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalled();
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

  it('Apply button calls onApply and closes', () => {
    const { modal, onApply, onClose } = createModal();
    modal.open();
    const applyBtn = document.querySelector('.settings-apply-btn') as HTMLElement;
    applyBtn.click();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled(); // close is called after apply
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
});
