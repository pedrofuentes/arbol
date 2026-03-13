import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartNameHeader, ChartNameHeaderOptions } from '../../src/ui/chart-name-header';

function defaultOptions(overrides: Partial<ChartNameHeaderOptions> = {}): ChartNameHeaderOptions {
  return {
    container: document.createElement('div'),
    initialName: 'My Org Chart',
    onRename: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined),
    onSaveVersion: vi.fn(),
    ...overrides,
  };
}

function getWrapper(container: HTMLElement): HTMLDivElement {
  return container.querySelector('[data-testid="chart-name-header"]') as HTMLDivElement;
}

function getNameDisplay(container: HTMLElement): HTMLSpanElement {
  return container.querySelector('[data-testid="chart-name-display"]') as HTMLSpanElement;
}

function getNameInput(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector('[data-testid="chart-name-input"]');
}

function getDirtyDot(container: HTMLElement): HTMLSpanElement {
  return container.querySelector('[data-testid="dirty-indicator"]') as HTMLSpanElement;
}

function getSaveBtn(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('[data-testid="save-version-btn"]') as HTMLButtonElement;
}

describe('ChartNameHeader', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('rendering', () => {
    it('renders wrapper with flex layout', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const wrapper = getWrapper(container);
      expect(wrapper).toBeTruthy();
      expect(wrapper.style.display).toBe('flex');
      expect(wrapper.style.alignItems).toBe('center');
      expect(wrapper.style.gap).toBe('6px');
    });

    it('renders the initial chart name', () => {
      new ChartNameHeader(defaultOptions({ container, initialName: 'Engineering' }));
      const nameEl = getNameDisplay(container);
      expect(nameEl).toBeTruthy();
      expect(nameEl.textContent).toBe('Engineering');
    });

    it('applies correct styles to the name display', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const nameEl = getNameDisplay(container);
      expect(nameEl.style.fontSize).toBe('13px');
      expect(nameEl.style.fontWeight).toBe('600');
      expect(nameEl.style.cursor).toBe('pointer');
    });

    it('renders the dirty dot hidden by default', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const dot = getDirtyDot(container);
      expect(dot).toBeTruthy();
      expect(dot.textContent).toBe('●');
      expect(dot.style.display).toBe('none');
    });

    it('renders the save version button', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const btn = getSaveBtn(container);
      expect(btn).toBeTruthy();
      expect(btn.textContent).toBe('💾');
      expect(btn.title).toBe('Save version');
    });

    it('applies correct styles to the save button', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const btn = getSaveBtn(container);
      expect(btn.style.backgroundColor).toBe('transparent');
      expect(btn.style.borderStyle).toBe('none');
      expect(btn.style.cursor).toBe('pointer');
      expect(btn.style.opacity).toBe('0.7');
    });
  });

  describe('setName', () => {
    it('updates the displayed name', () => {
      const header = new ChartNameHeader(defaultOptions({ container }));
      header.setName('New Name');
      expect(getNameDisplay(container).textContent).toBe('New Name');
    });
  });

  describe('setDirty', () => {
    it('shows the dirty dot when set to true', () => {
      const header = new ChartNameHeader(defaultOptions({ container }));
      header.setDirty(true);
      expect(getDirtyDot(container).style.display).toBe('inline');
    });

    it('hides the dirty dot when set to false', () => {
      const header = new ChartNameHeader(defaultOptions({ container }));
      header.setDirty(true);
      header.setDirty(false);
      expect(getDirtyDot(container).style.display).toBe('none');
    });
  });

  describe('save version button', () => {
    it('calls onSaveVersion when clicked', () => {
      const onSaveVersion = vi.fn();
      new ChartNameHeader(defaultOptions({ container, onSaveVersion }));
      getSaveBtn(container).click();
      expect(onSaveVersion).toHaveBeenCalledOnce();
    });
  });

  describe('inline editing', () => {
    it('enters edit mode on name click', () => {
      new ChartNameHeader(defaultOptions({ container }));
      getNameDisplay(container).click();
      const input = getNameInput(container);
      expect(input).toBeTruthy();
      expect(input!.value).toBe('My Org Chart');
    });

    it('sets maxLength on input', () => {
      new ChartNameHeader(defaultOptions({ container }));
      getNameDisplay(container).click();
      const input = getNameInput(container);
      expect(input!.maxLength).toBe(100);
    });

    it('sets aria-label on input', () => {
      new ChartNameHeader(defaultOptions({ container }));
      getNameDisplay(container).click();
      const input = getNameInput(container);
      expect(input!.getAttribute('aria-label')).toBe('Chart name');
    });

    it('confirms rename on Enter', async () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = 'Renamed Chart';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onRename).toHaveBeenCalledWith('Renamed Chart');
      // After confirm, name span should be back
      expect(getNameDisplay(container)).toBeTruthy();
      expect(getNameDisplay(container).textContent).toBe('Renamed Chart');
    });

    it('confirms rename on blur', async () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = 'Blurred Name';
      input.dispatchEvent(new Event('blur'));
      expect(onRename).toHaveBeenCalledWith('Blurred Name');
      expect(getNameDisplay(container).textContent).toBe('Blurred Name');
    });

    it('cancels edit on Escape', () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, initialName: 'Original', onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = 'Should Not Save';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(onRename).not.toHaveBeenCalled();
      expect(getNameDisplay(container).textContent).toBe('Original');
    });

    it('reverts to previous name when input is empty', () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, initialName: 'Keep This', onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = '';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onRename).not.toHaveBeenCalled();
      expect(getNameDisplay(container).textContent).toBe('Keep This');
    });

    it('reverts to previous name when input is whitespace only', () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, initialName: 'Keep This', onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = '   ';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onRename).not.toHaveBeenCalled();
      expect(getNameDisplay(container).textContent).toBe('Keep This');
    });

    it('does not call onRename when name is unchanged', () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined);
      new ChartNameHeader(defaultOptions({ container, initialName: 'Same Name', onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      // Keep value unchanged
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(onRename).not.toHaveBeenCalled();
    });

    it('reverts name if onRename rejects', async () => {
      const onRename = vi.fn<(name: string) => Promise<void>>().mockRejectedValue(new Error('fail'));
      new ChartNameHeader(defaultOptions({ container, initialName: 'Original', onRename }));
      getNameDisplay(container).click();
      const input = getNameInput(container)!;
      input.value = 'Bad Name';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      // Wait for the promise rejection to be handled
      await vi.waitFor(() => {
        expect(getNameDisplay(container).textContent).toBe('Original');
      });
    });

    it('does not enter edit mode twice on double click', () => {
      new ChartNameHeader(defaultOptions({ container }));
      getNameDisplay(container).click();
      // Input replaces span, so clicking again should be a no-op (no span to click)
      const input = getNameInput(container);
      expect(input).toBeTruthy();
      // The wrapper should have exactly: input, dirtyDot, saveBtn
      const wrapper = getWrapper(container);
      expect(wrapper.children.length).toBe(3);
    });

    it('does not update displayed name via setName while editing', () => {
      const header = new ChartNameHeader(defaultOptions({ container }));
      getNameDisplay(container).click();
      header.setName('External Update');
      const input = getNameInput(container)!;
      expect(input.value).toBe('My Org Chart');
    });
  });

  describe('destroy', () => {
    it('removes the wrapper from the container', () => {
      const header = new ChartNameHeader(defaultOptions({ container }));
      expect(getWrapper(container)).toBeTruthy();
      header.destroy();
      expect(getWrapper(container)).toBeNull();
    });

    it('cleans up event listeners (no errors on click after destroy)', () => {
      const onSaveVersion = vi.fn();
      const header = new ChartNameHeader(defaultOptions({ container, onSaveVersion }));
      const btn = getSaveBtn(container);
      header.destroy();
      // Re-append the detached button to test it no longer fires
      container.appendChild(btn);
      btn.click();
      expect(onSaveVersion).not.toHaveBeenCalled();
    });
  });

  describe('hover behavior', () => {
    it('underlines name on mouseenter', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const nameEl = getNameDisplay(container);
      nameEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      expect(nameEl.style.textDecoration).toBe('underline');
    });

    it('removes underline on mouseleave', () => {
      new ChartNameHeader(defaultOptions({ container }));
      const nameEl = getNameDisplay(container);
      nameEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      nameEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(nameEl.style.textDecoration).toBe('none');
    });
  });
});
