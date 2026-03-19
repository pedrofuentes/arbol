import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresetCreator } from '../../src/ui/preset-creator';

describe('PresetCreator', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders preset creation form with heading', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    expect(container.textContent).toContain('Create Mapping Preset');
  });

  it('renders text inputs for preset name, name, title, reports to, and id columns', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBeGreaterThanOrEqual(5);
  });

  it('renders radio buttons for parent reference type', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBe(2);
  });

  it('has By Name selected by default', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const byName = Array.from(radios).find((r) => r.value === 'name');
    expect(byName!.checked).toBe(true);
  });

  it('By ID radio is disabled when ID field is empty', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const byId = Array.from(radios).find((r) => r.value === 'id');
    expect(byId!.disabled).toBe(true);
  });

  it('By ID radio is enabled when ID field has a value', () => {
    new PresetCreator(container, vi.fn(), vi.fn());
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    // ID column is the last text input (placeholder contains "employee_id")
    const idInput = Array.from(inputs).find((i) => i.placeholder.includes('employee_id'))!;
    idInput.value = 'emp_id';
    idInput.dispatchEvent(new Event('input'));

    const byId = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ).find((r) => r.value === 'id');
    expect(byId!.disabled).toBe(false);
  });

  it('calls onSave with preset data when form is valid', () => {
    const onSave = vi.fn();
    new PresetCreator(container, onSave, vi.fn());
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

    // Fill: preset name, name col, title col, reports to col
    inputs[0].value = 'My Preset';
    inputs[1].value = 'employee_name';
    inputs[2].value = 'job_title';
    inputs[3].value = 'supervisor';

    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save',
    );
    saveBtn!.click();

    expect(onSave).toHaveBeenCalledWith({
      name: 'My Preset',
      mapping: {
        name: 'employee_name',
        title: 'job_title',
        parentRef: 'supervisor',
        id: undefined,
        parentRefType: 'name',
      },
    });
  });

  it('shows error when preset name is empty', () => {
    const onSave = vi.fn();
    new PresetCreator(container, onSave, vi.fn());
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

    // Leave preset name empty, fill the rest
    inputs[1].value = 'name';
    inputs[2].value = 'title';
    inputs[3].value = 'parent';

    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save',
    );
    saveBtn!.click();

    expect(onSave).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Preset name is required');
  });

  it('shows error when required columns are empty', () => {
    const onSave = vi.fn();
    new PresetCreator(container, onSave, vi.fn());
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

    inputs[0].value = 'My Preset';
    // Leave name, title, parentRef empty

    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save',
    );
    saveBtn!.click();

    expect(onSave).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Name, Title, and Reports To columns are required');
  });

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn();
    new PresetCreator(container, vi.fn(), onCancel);

    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Cancel',
    );
    cancelBtn!.click();

    expect(onCancel).toHaveBeenCalled();
  });

  it('cleans up on destroy', () => {
    const creator = new PresetCreator(container, vi.fn(), vi.fn());
    creator.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('includes id and parentRefType "id" when By ID is selected', () => {
    const onSave = vi.fn();
    new PresetCreator(container, onSave, vi.fn());
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

    inputs[0].value = 'ID Preset';
    inputs[1].value = 'name';
    inputs[2].value = 'title';
    inputs[3].value = 'manager_id';
    // Set ID column
    const idInput = Array.from(inputs).find((i) => i.placeholder.includes('employee_id'))!;
    idInput.value = 'emp_id';
    idInput.dispatchEvent(new Event('input'));

    // Select By ID radio
    const byId = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ).find((r) => r.value === 'id')!;
    byId.checked = true;

    const saveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save',
    );
    saveBtn!.click();

    expect(onSave).toHaveBeenCalledWith({
      name: 'ID Preset',
      mapping: {
        name: 'name',
        title: 'title',
        parentRef: 'manager_id',
        id: 'emp_id',
        parentRefType: 'id',
      },
    });
  });

  describe('aria-invalid on validation errors', () => {
    it('errorArea has an id', () => {
      new PresetCreator(container, vi.fn(), vi.fn());
      const errorArea = container.querySelector('.error-msg') as HTMLElement;
      expect(errorArea.id).toBeTruthy();
    });

    it('sets aria-invalid on preset name input when name is empty', () => {
      new PresetCreator(container, vi.fn(), vi.fn());
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

      inputs[1].value = 'name';
      inputs[2].value = 'title';
      inputs[3].value = 'parent';

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save',
      )!;
      saveBtn.click();

      expect(inputs[0].getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-describedby on preset name input referencing error area', () => {
      new PresetCreator(container, vi.fn(), vi.fn());
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
      const errorArea = container.querySelector('.error-msg') as HTMLElement;

      inputs[1].value = 'name';
      inputs[2].value = 'title';
      inputs[3].value = 'parent';

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save',
      )!;
      saveBtn.click();

      expect(inputs[0].getAttribute('aria-describedby')).toBe(errorArea.id);
    });

    it('sets aria-invalid on required column inputs when columns are empty', () => {
      new PresetCreator(container, vi.fn(), vi.fn());
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

      inputs[0].value = 'My Preset';
      // Leave name, title, parentRef empty

      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save',
      )!;
      saveBtn.click();

      // name, title, parentRef inputs should be marked invalid
      expect(inputs[1].getAttribute('aria-invalid')).toBe('true');
      expect(inputs[2].getAttribute('aria-invalid')).toBe('true');
      expect(inputs[3].getAttribute('aria-invalid')).toBe('true');
    });

    it('clears aria-invalid at start of handleSave', () => {
      const onSave = vi.fn();
      new PresetCreator(container, onSave, vi.fn());
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');

      // First call — triggers error
      const saveBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save',
      )!;
      saveBtn.click();
      expect(inputs[0].getAttribute('aria-invalid')).toBe('true');

      // Fix values and retry
      inputs[0].value = 'My Preset';
      inputs[1].value = 'name';
      inputs[2].value = 'title';
      inputs[3].value = 'parent';
      saveBtn.click();

      expect(inputs[0].hasAttribute('aria-invalid')).toBe(false);
      expect(inputs[1].hasAttribute('aria-invalid')).toBe(false);
      expect(inputs[2].hasAttribute('aria-invalid')).toBe(false);
      expect(inputs[3].hasAttribute('aria-invalid')).toBe(false);
      expect(onSave).toHaveBeenCalled();
    });
  });
});
