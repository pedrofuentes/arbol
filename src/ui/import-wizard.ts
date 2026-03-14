import { t } from '../i18n';

export interface WizardStep {
  id: string;
  label: string;
}

export interface ImportWizardOptions {
  steps: WizardStep[];
  onClose: () => void;
  onStepChange: (stepId: string, stepIndex: number) => void;
  onComplete: () => void;
}

export class ImportWizard {
  private overlay: HTMLDivElement;
  private stepContentArea: HTMLDivElement;
  private backBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private stepEls: HTMLDivElement[] = [];
  private currentStep = 0;
  private steps: WizardStep[];
  private options: ImportWizardOptions;
  private previousFocus: HTMLElement | null = null;
  private mounted = false;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(options: ImportWizardOptions) {
    this.options = options;
    this.steps = options.steps;

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'import-wizard-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Wizard container
    const wizard = document.createElement('div');
    wizard.className = 'import-wizard';
    wizard.setAttribute('role', 'dialog');
    wizard.setAttribute('aria-modal', 'true');

    // Header
    const header = document.createElement('div');
    header.className = 'import-wizard-header';

    const title = document.createElement('span');
    title.className = 'import-wizard-title';
    title.id = 'import-wizard-title';
    title.textContent = t('import_wizard.title');
    wizard.setAttribute('aria-labelledby', 'import-wizard-title');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'import-wizard-close';
    closeBtn.setAttribute('aria-label', t('import_wizard.close_aria'));
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Step indicator
    const stepsNav = document.createElement('div');
    stepsNav.className = 'wizard-steps';
    stepsNav.setAttribute('role', 'navigation');
    stepsNav.setAttribute('aria-label', t('import_wizard.steps_aria'));

    for (let i = 0; i < this.steps.length; i++) {
      const stepEl = document.createElement('div');
      stepEl.className = 'wizard-step';
      if (i === 0) {
        stepEl.classList.add('active');
        stepEl.setAttribute('aria-current', 'step');
      }

      const num = document.createElement('span');
      num.className = 'step-num';
      num.textContent = String(i + 1);

      stepEl.appendChild(num);
      stepEl.appendChild(document.createTextNode(` ${this.steps[i].label}`));

      stepsNav.appendChild(stepEl);
      this.stepEls.push(stepEl);
    }

    // Content area
    this.stepContentArea = document.createElement('div');
    this.stepContentArea.className = 'wizard-body';
    this.stepContentArea.setAttribute('role', 'region');
    this.stepContentArea.setAttribute('aria-live', 'polite');

    // Footer
    const footer = document.createElement('div');
    footer.className = 'wizard-footer';

    this.backBtn = document.createElement('button');
    this.backBtn.className = 'wizard-back-btn';
    this.backBtn.textContent = t('import_wizard.back');
    this.backBtn.style.display = 'none';
    this.backBtn.addEventListener('click', () => this.prevStep());

    const spacer = document.createElement('div');
    spacer.style.flex = '1';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'wizard-cancel-btn';
    cancelBtn.textContent = t('import_wizard.cancel');
    cancelBtn.addEventListener('click', () => this.close());

    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'wizard-next-btn';
    this.nextBtn.textContent = t('import_wizard.next');
    this.nextBtn.addEventListener('click', () => {
      if (this.currentStep === this.steps.length - 1) {
        options.onComplete();
      } else {
        this.nextStep();
      }
    });

    footer.appendChild(this.backBtn);
    footer.appendChild(spacer);
    footer.appendChild(cancelBtn);
    footer.appendChild(this.nextBtn);

    wizard.appendChild(header);
    wizard.appendChild(stepsNav);
    wizard.appendChild(this.stepContentArea);
    wizard.appendChild(footer);
    this.overlay.appendChild(wizard);

    // Escape key
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.isOpen() && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
  }

  open(): void {
    if (!this.mounted) {
      document.body.appendChild(this.overlay);
      this.mounted = true;
    }
    this.previousFocus = document.activeElement as HTMLElement | null;
    this.currentStep = 0;
    this.updateStepIndicator();
    this.updateButtons();
    this.clearContent();
    this.overlay.classList.add('open');
    document.addEventListener('keydown', this.keyHandler, true);
    const closeBtn = this.overlay.querySelector('.import-wizard-close') as HTMLElement;
    if (closeBtn) requestAnimationFrame(() => closeBtn.focus());
  }

  close(): void {
    this.overlay.classList.remove('open');
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
    this.options.onClose();
  }

  isOpen(): boolean {
    return this.overlay.classList.contains('open');
  }

  getStepContentArea(): HTMLElement {
    return this.stepContentArea;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  getCurrentStepId(): string {
    return this.steps[this.currentStep]?.id ?? '';
  }

  nextStep(): void {
    if (this.currentStep >= this.steps.length - 1) return;
    this.currentStep++;
    this.updateStepIndicator();
    this.updateButtons();
    this.clearContent();
    this.options.onStepChange(this.getCurrentStepId(), this.currentStep);
  }

  prevStep(): void {
    if (this.currentStep <= 0) return;
    this.currentStep--;
    this.updateStepIndicator();
    this.updateButtons();
    this.clearContent();
    this.options.onStepChange(this.getCurrentStepId(), this.currentStep);
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    this.currentStep = index;
    this.updateStepIndicator();
    this.updateButtons();
    this.clearContent();
    this.options.onStepChange(this.getCurrentStepId(), this.currentStep);
  }

  setNextEnabled(enabled: boolean): void {
    this.nextBtn.disabled = !enabled;
  }

  setNextLabel(label: string): void {
    this.nextBtn.textContent = label;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.keyHandler, true);
    if (this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.mounted = false;
  }

  private updateStepIndicator(): void {
    for (let i = 0; i < this.stepEls.length; i++) {
      const el = this.stepEls[i];
      el.classList.remove('active', 'done');
      el.removeAttribute('aria-current');

      if (i < this.currentStep) {
        el.classList.add('done');
      } else if (i === this.currentStep) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'step');
      }
    }
  }

  private updateButtons(): void {
    this.backBtn.style.display = this.currentStep === 0 ? 'none' : '';
    if (this.currentStep === this.steps.length - 1) {
      this.nextBtn.textContent = t('import_wizard.complete');
    } else {
      this.nextBtn.textContent = t('import_wizard.next');
    }
  }

  private clearContent(): void {
    while (this.stepContentArea.firstChild) {
      this.stepContentArea.removeChild(this.stepContentArea.firstChild);
    }
  }
}
