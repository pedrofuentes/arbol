import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pptxgenjs: ['pptxgenjs'],
          xlsx: ['xlsx'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
