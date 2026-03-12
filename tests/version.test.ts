import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('version', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports APP_VERSION as a string', async () => {
    const { APP_VERSION } = await import('../src/version');
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('APP_VERSION matches semver pattern when injected', async () => {
    const { APP_VERSION } = await import('../src/version');
    // In test environment, __APP_VERSION__ is defined via vite config
    // so it should be the package.json version (semver)
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
