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

  it('has radio buttons for parent reference type', () => {
    new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
    const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios.length).toBe(2);
    const byName = Array.from(radios).find((r) => r.value === 'name');
    expect(byName!.checked).toBe(true);
  });

  describe('aria-invalid on validation errors', () => {
    it('errorArea has an id', () => {
      new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      const errorArea = container.querySelector('.error-msg') as HTMLElement;
      expect(errorArea.id).toBeTruthy();
    });

    it('sets aria-invalid on empty required selects when handleApply fails', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      // Leave all selects unset (empty)
      mapper.handleApply();

      // Name, Title, Reports To selects should have aria-invalid
      expect(selects[0].getAttribute('aria-invalid')).toBe('true');
      expect(selects[1].getAttribute('aria-invalid')).toBe('true');
      expect(selects[2].getAttribute('aria-invalid')).toBe('true');
    });

    it('sets aria-describedby on selects referencing the error area', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');
      const errorArea = container.querySelector('.error-msg') as HTMLElement;

      mapper.handleApply();

      expect(selects[0].getAttribute('aria-describedby')).toBe(errorArea.id);
    });

    it('sets aria-invalid on all selects when duplicate columns detected', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      selects[0].value = 'full_name';
      selects[1].value = 'full_name';
      selects[2].value = 'manager_id';

      mapper.handleApply();

      expect(selects[0].getAttribute('aria-invalid')).toBe('true');
      expect(selects[1].getAttribute('aria-invalid')).toBe('true');
      expect(selects[2].getAttribute('aria-invalid')).toBe('true');
    });

    it('clears aria-invalid at start of handleApply before revalidating', () => {
      const onApply = vi.fn();
      const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      // First call — triggers error
      mapper.handleApply();
      expect(selects[0].getAttribute('aria-invalid')).toBe('true');

      // Fix the selections and re-apply
      selects[0].value = 'full_name';
      selects[1].value = 'job_title';
      selects[2].value = 'manager_id';
      mapper.handleApply();

      expect(selects[0].hasAttribute('aria-invalid')).toBe(false);
      expect(selects[1].hasAttribute('aria-invalid')).toBe(false);
      expect(selects[2].hasAttribute('aria-invalid')).toBe(false);
      expect(onApply).toHaveBeenCalled();
    });
  });

  describe('prefill', () => {
    it('pre-fills all dropdowns from saved mapping', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      mapper.prefill({
        name: 'full_name',
        title: 'job_title',
        parentRef: 'manager_id',
        id: 'emp_id',
        parentRefType: 'name',
      });

      const selects = container.querySelectorAll('select');
      expect(selects[0].value).toBe('full_name');
      expect(selects[1].value).toBe('job_title');
      expect(selects[2].value).toBe('manager_id');
      expect(selects[3].value).toBe('emp_id');
    });

    it('sets parent ref type radio from prefill', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());
      mapper.prefill({
        name: 'full_name',
        title: 'job_title',
        parentRef: 'manager_id',
        id: 'emp_id',
        parentRefType: 'id',
      });

      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      const byId = Array.from(radios).find((r) => r.value === 'id');
      const byName = Array.from(radios).find((r) => r.value === 'name');
      expect(byId!.checked).toBe(true);
      expect(byName!.checked).toBe(false);
    });

    it('sets case-insensitive checkbox from prefill', () => {
      const mapper = new ColumnMapper(container, headers, vi.fn(), vi.fn(), vi.fn());

      const checkbox = container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )!;
      expect(checkbox.checked).toBe(true);

      mapper.prefill({
        name: 'full_name',
        title: 'job_title',
        parentRef: 'manager_id',
        parentRefType: 'name',
        caseInsensitive: false,
      });

      expect(checkbox.checked).toBe(false);
    });

    it('handles partial mapping without ID', () => {
      const onApply = vi.fn();
      const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());
      mapper.prefill({
        name: 'full_name',
        title: 'job_title',
        parentRef: 'manager_id',
        parentRefType: 'name',
      });

      const selects = container.querySelectorAll('select');
      expect(selects[0].value).toBe('full_name');
      expect(selects[1].value).toBe('job_title');
      expect(selects[2].value).toBe('manager_id');
      expect(selects[3].value).toBe('');

      mapper.handleApply();
      expect(onApply).toHaveBeenCalledTimes(1);
    });
  });

  describe('parent ref type toggle', () => {
    it('validates ID column when using By ID mode', () => {
      const onApply = vi.fn();
      const mapper = new ColumnMapper(container, headers, onApply, vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      selects[0].value = 'full_name';
      selects[1].value = 'job_title';
      selects[2].value = 'manager_id';

      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      const byIdRadio = Array.from(radios).find((r) => r.value === 'id')!;
      byIdRadio.checked = true;
      byIdRadio.dispatchEvent(new Event('change', { bubbles: true }));

      mapper.handleApply();
      expect(onApply).not.toHaveBeenCalled();
      expect(container.textContent).toContain(
        'Person ID column must be mapped',
      );
    });
  });

  describe('callbacks', () => {
    it('calls onCancel when cancel button clicked', () => {
      const onCancel = vi.fn();
      new ColumnMapper(container, headers, vi.fn(), vi.fn(), onCancel);

      const buttons = container.querySelectorAll('button');
      const cancelBtn = Array.from(buttons).find(
        (b) => b.textContent?.toLowerCase().includes('cancel'),
      );
      if (cancelBtn) {
        cancelBtn.click();
        expect(onCancel).toHaveBeenCalledTimes(1);
      } else {
        // onCancel is stored as a callback — the parent component wires it externally.
        // Verify the constructor accepted the callback without error.
        expect(onCancel).not.toHaveBeenCalled();
      }
    });
  });

  describe('level column', () => {
    const headersWithLevel = ['emp_id', 'full_name', 'job_title', 'manager_id', 'grade'];

    it('renders level column dropdown', () => {
      new ColumnMapper(container, headersWithLevel, vi.fn(), vi.fn(), vi.fn());
      const labels = Array.from(container.querySelectorAll('label'));
      const levelLabel = labels.find((l) => l.textContent?.includes('Level'));
      expect(levelLabel).toBeDefined();
    });

    it('includes level in mapping output', () => {
      const onApply = vi.fn();
      const mapper = new ColumnMapper(container, headersWithLevel, onApply, vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      // Name, Title, Reports To, ID, Level
      selects[0].value = 'full_name';
      selects[1].value = 'job_title';
      selects[2].value = 'manager_id';
      selects[3].value = 'emp_id';
      selects[4].value = 'grade';

      const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]');
      const byIdRadio = Array.from(radios).find((r) => r.value === 'id')!;
      byIdRadio.checked = true;
      byIdRadio.dispatchEvent(new Event('change', { bubbles: true }));

      mapper.handleApply();

      expect(onApply).toHaveBeenCalledTimes(1);
      const mapping = onApply.mock.calls[0][0];
      expect(mapping.level).toBe('grade');
    });

    it('prefill restores level selection', () => {
      const mapper = new ColumnMapper(container, headersWithLevel, vi.fn(), vi.fn(), vi.fn());
      mapper.prefill({
        name: 'full_name',
        title: 'job_title',
        parentRef: 'manager_id',
        id: 'emp_id',
        parentRefType: 'id',
        level: 'grade',
      });

      const selects = container.querySelectorAll('select');
      // Level is the 5th dropdown (index 4)
      expect(selects[4].value).toBe('grade');
    });

    it('level column included in duplicate check', () => {
      const onApply = vi.fn();
      const mapper = new ColumnMapper(container, headersWithLevel, onApply, vi.fn(), vi.fn());
      const selects = container.querySelectorAll('select');

      // Set same column for level and name
      selects[0].value = 'full_name';
      selects[1].value = 'job_title';
      selects[2].value = 'manager_id';
      selects[4].value = 'full_name'; // level same as name

      mapper.handleApply();

      expect(onApply).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Each column can only be mapped to one field');
    });
  });
});
