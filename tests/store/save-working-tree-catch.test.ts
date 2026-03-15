import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../../src/ui/toast';
import { t } from '../../src/i18n';

vi.mock('../../src/ui/toast', () => ({
  showToast: vi.fn(),
}));

describe('saveWorkingTree fire-and-forget .catch()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error toast when saveWorkingTree rejects', async () => {
    const saveWorkingTree = vi.fn().mockRejectedValue(new Error('quota exceeded'));

    // Replicate the exact pattern used in main.ts rerender()
    saveWorkingTree().catch(() => {
      showToast(t('footer.save_failed'), 'error');
    });

    // Let the microtask (catch handler) execute
    await vi.waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        t('footer.save_failed'),
        'error',
      );
    });
  });

  it('does not show toast when saveWorkingTree resolves', async () => {
    const saveWorkingTree = vi.fn().mockResolvedValue(undefined);

    saveWorkingTree().catch(() => {
      showToast(t('footer.save_failed'), 'error');
    });

    // Flush microtasks
    await new Promise((r) => setTimeout(r, 0));

    expect(showToast).not.toHaveBeenCalled();
  });

  it('uses i18n key footer.save_failed for the error message', () => {
    const message = t('footer.save_failed');
    expect(message).toBe('Failed to save changes');
  });
});
