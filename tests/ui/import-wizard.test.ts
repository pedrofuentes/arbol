import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { setLocale } from '../../src/i18n';
import en from '../../src/i18n/en';
import { ImportWizard } from '../../src/ui/import-wizard';

beforeAll(() => { setLocale('en', en); });

const defaultSteps = [
  { id: 'source', label: 'Source' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'preview', label: 'Preview' },
  { id: 'import', label: 'Import' },
];

function createWizard() {
  const onClose = vi.fn();
  const onStepChange = vi.fn();
  const onComplete = vi.fn();
  const wizard = new ImportWizard({ steps: defaultSteps, onClose, onStepChange, onComplete });
  return { wizard, onClose, onStepChange, onComplete };
}

describe('ImportWizard', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('is hidden by default', () => {
    const { wizard } = createWizard();
    expect(wizard.isOpen()).toBe(false);
    wizard.destroy();
  });

  it('open() shows overlay', () => {
    const { wizard } = createWizard();
    wizard.open();
    expect(wizard.isOpen()).toBe(true);
    expect(document.querySelector('.import-wizard-overlay.open')).not.toBeNull();
    wizard.destroy();
  });

  it('close() hides overlay and calls onClose', () => {
    const { wizard, onClose } = createWizard();
    wizard.open();
    wizard.close();
    expect(wizard.isOpen()).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    wizard.destroy();
  });

  it('close button closes wizard', () => {
    const { wizard, onClose } = createWizard();
    wizard.open();
    (document.querySelector('.import-wizard-close') as HTMLElement).click();
    expect(onClose).toHaveBeenCalled();
    wizard.destroy();
  });

  it('overlay click closes wizard', () => {
    const { wizard } = createWizard();
    wizard.open();
    (document.querySelector('.import-wizard-overlay') as HTMLElement).click();
    expect(wizard.isOpen()).toBe(false);
    wizard.destroy();
  });

  it('Escape closes wizard', () => {
    const { wizard } = createWizard();
    wizard.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(wizard.isOpen()).toBe(false);
    wizard.destroy();
  });

  it('Cancel button closes wizard', () => {
    const { wizard, onClose } = createWizard();
    wizard.open();
    (document.querySelector('.wizard-cancel-btn') as HTMLElement).click();
    expect(onClose).toHaveBeenCalled();
    wizard.destroy();
  });

  it('renders 4 step indicators', () => {
    const { wizard } = createWizard();
    wizard.open();
    expect(document.querySelectorAll('.wizard-step').length).toBe(4);
    wizard.destroy();
  });

  it('step 1 is active by default', () => {
    const { wizard } = createWizard();
    wizard.open();
    expect(wizard.getCurrentStep()).toBe(0);
    expect(wizard.getCurrentStepId()).toBe('source');
    const steps = document.querySelectorAll('.wizard-step');
    expect(steps[0].classList.contains('active')).toBe(true);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    wizard.destroy();
  });

  it('Back button hidden on first step', () => {
    const { wizard } = createWizard();
    wizard.open();
    const backBtn = document.querySelector('.wizard-back-btn') as HTMLElement;
    expect(backBtn.style.display).toBe('none');
    wizard.destroy();
  });

  it('nextStep() advances and calls onStepChange', () => {
    const { wizard, onStepChange } = createWizard();
    wizard.open();
    wizard.nextStep();
    expect(wizard.getCurrentStep()).toBe(1);
    expect(wizard.getCurrentStepId()).toBe('mapping');
    expect(onStepChange).toHaveBeenCalledWith('mapping', 1);
    wizard.destroy();
  });

  it('Back button visible after advancing', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.nextStep();
    const backBtn = document.querySelector('.wizard-back-btn') as HTMLElement;
    expect(backBtn.style.display).not.toBe('none');
    wizard.destroy();
  });

  it('prevStep() goes back', () => {
    const { wizard, onStepChange } = createWizard();
    wizard.open();
    wizard.nextStep();
    wizard.prevStep();
    expect(wizard.getCurrentStep()).toBe(0);
    expect(onStepChange).toHaveBeenCalledWith('source', 0);
    wizard.destroy();
  });

  it('prevStep() on first step is no-op', () => {
    const { wizard, onStepChange } = createWizard();
    wizard.open();
    wizard.prevStep();
    expect(wizard.getCurrentStep()).toBe(0);
    expect(onStepChange).not.toHaveBeenCalled();
    wizard.destroy();
  });

  it('completed steps have done class', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.nextStep();
    wizard.nextStep();
    const steps = document.querySelectorAll('.wizard-step');
    expect(steps[0].classList.contains('done')).toBe(true);
    expect(steps[1].classList.contains('done')).toBe(true);
    expect(steps[2].classList.contains('active')).toBe(true);
    wizard.destroy();
  });

  it('Next button shows "Import" on last step', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.nextStep();
    wizard.nextStep();
    wizard.nextStep();
    const nextBtn = document.querySelector('.wizard-next-btn') as HTMLElement;
    expect(nextBtn.textContent).toContain('Import');
    wizard.destroy();
  });

  it('clicking Next on last step calls onComplete', () => {
    const { wizard, onComplete } = createWizard();
    wizard.open();
    wizard.goToStep(3);
    (document.querySelector('.wizard-next-btn') as HTMLElement).click();
    expect(onComplete).toHaveBeenCalledTimes(1);
    wizard.destroy();
  });

  it('goToStep() jumps to specific step', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.goToStep(2);
    expect(wizard.getCurrentStep()).toBe(2);
    expect(wizard.getCurrentStepId()).toBe('preview');
    wizard.destroy();
  });

  it('setNextEnabled disables Next button', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.setNextEnabled(false);
    const nextBtn = document.querySelector('.wizard-next-btn') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
    wizard.destroy();
  });

  it('setNextLabel changes button text', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.setNextLabel('Custom');
    const nextBtn = document.querySelector('.wizard-next-btn') as HTMLElement;
    expect(nextBtn.textContent).toBe('Custom');
    wizard.destroy();
  });

  it('content area cleared on step change', () => {
    const { wizard } = createWizard();
    wizard.open();
    const area = wizard.getStepContentArea();
    area.appendChild(document.createElement('p'));
    expect(area.children.length).toBe(1);
    wizard.nextStep();
    expect(area.children.length).toBe(0);
    wizard.destroy();
  });

  it('has role="dialog" and aria-modal', () => {
    const { wizard } = createWizard();
    wizard.open();
    const dialog = document.querySelector('.import-wizard');
    expect(dialog!.getAttribute('role')).toBe('dialog');
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    wizard.destroy();
  });

  it('step nav has role="navigation"', () => {
    const { wizard } = createWizard();
    wizard.open();
    const nav = document.querySelector('.wizard-steps');
    expect(nav!.getAttribute('role')).toBe('navigation');
    wizard.destroy();
  });

  it('content area has aria-live="polite"', () => {
    const { wizard } = createWizard();
    wizard.open();
    const area = document.querySelector('.wizard-body');
    expect(area!.getAttribute('aria-live')).toBe('polite');
    wizard.destroy();
  });

  it('destroy removes overlay', () => {
    const { wizard } = createWizard();
    wizard.open();
    wizard.destroy();
    expect(document.querySelector('.import-wizard-overlay')).toBeNull();
  });
});
