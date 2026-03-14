import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColumnMapper } from '../../src/ui/column-mapper';

describe('ColumnMapper', () => {
  let container: HTMLElement;
  const headers = ['emp_id', 'full_name', 'job_title', 'manager_id'];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders mapping UI with heading', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    expect(container.textContent).toContain('Map CSV Columns');
  });

  it('renders select dropdowns for column mapping', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('populates dropdowns with CSV headers', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const firstSelect = container.querySelector('select')!;
    const options = Array.from(firstSelect.options).map((o) => o.value);
    expect(options).toContain('full_name');
    expect(options).toContain('job_title');
    expect(options).toContain('manager_id');
  });

  it('calls onApply with mapping when handleApply is called with valid selections', () => {
    const onApply = vi.fn();
    const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());
    const selects = container.querySelectorAll('select');

    // Name, Title, Reports To, ID (first 4 selects are column mapping dropdowns)
    selects[0].value = 'full_name';
    selects[1].value = 'job_title';
    selects[2].value = 'manager_id';

    mapper.handleApply();

    expect(onApply).toHaveBeenCalledTimes(1);
    const mapping = onApply.mock.calls[0][0];
    expect(mapping.name).toBe('full_name');
    expect(mapping.title).toBe('job_title');
    expect(mapping.parentRef).toBe('manager_id');
    expect(mapping.parentRefType).toBe('name');
  });

  it('shows error when required fields are not selected', () => {
    const onApply = vi.fn();
    const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());

    mapper.handleApply();

    expect(onApply).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      'Please select a column for Name, Title, and Reports To',
    );
  });

  it('shows error for duplicate column selections', () => {
    const onApply = vi.fn();
    const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());
    const selects = container.querySelectorAll('select');

    // Set same column for name and title
    selects[0].value = 'full_name';
    selects[1].value = 'full_name';
    selects[2].value = 'manager_id';

    mapper.handleApply();

    expect(onApply).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Each column can only be mapped to one field');
  });

  it('cleans up on destroy', () => {
    const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    mapper.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('includes case-insensitive checkbox defaulting to checked', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    const caseCheckbox = Array.from(checkboxes).find((c) =>
      c.parentElement?.textContent?.includes('Case-insensitive'),
    );
    expect(caseCheckbox).not.toBeUndefined();
    expect(caseCheckbox!.checked).toBe(true);
  });

  it('renders save as preset section', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    expect(container.textContent).toContain('Save as Preset');
    expect(container.textContent).toContain('Save Preset');
  });

  it('save preset button is disabled by default', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const savePresetBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Save Preset',
    ) as HTMLButtonElement;
    expect(savePresetBtn.disabled).toBe(true);
  });

  it('has radio buttons for parent reference type', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios.length).toBe(2);
    const byName = Array.from(radios).find((r) => r.value === 'name');
    expect(byName!.checked).toBe(true);
  });
});
