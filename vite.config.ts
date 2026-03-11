import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pptxgenjs: ['pptxgenjs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
