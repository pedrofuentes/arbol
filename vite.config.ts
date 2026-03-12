import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
