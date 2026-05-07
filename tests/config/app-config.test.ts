import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadAppConfig, getAppConfig, resetAppConfig } from '../../src/config/app-config';

describe('app-config', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetAppConfig();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('loadAppConfig', () => {
    it('loads valid config with importInstructions', async () => {
      const config = { importInstructions: '## Hello' };
      fetchSpy.mockResolvedValue(new Response(JSON.stringify(config), { status: 200 }));

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBe('## Hello');
    });

    it('returns empty config on 404', async () => {
      fetchSpy.mockResolvedValue(new Response('', { status: 404 }));

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBeUndefined();
    });

    it('returns empty config on network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBeUndefined();
    });

    it('returns empty config on malformed JSON', async () => {
      fetchSpy.mockResolvedValue(new Response('not json {{{', { status: 200 }));

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBeUndefined();
    });

    it('returns empty config when importInstructions is missing', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ otherKey: 'value' }), { status: 200 }),
      );

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBeUndefined();
    });

    it('ignores non-string importInstructions', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ importInstructions: 42 }), { status: 200 }),
      );

      await loadAppConfig();
      const result = getAppConfig();
      expect(result.importInstructions).toBeUndefined();
    });
  });

  describe('getAppConfig', () => {
    it('returns empty config before loadAppConfig is called', () => {
      const result = getAppConfig();
      expect(result).toEqual({});
    });
  });
});
