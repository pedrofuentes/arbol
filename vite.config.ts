import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    {
      name: 'strip-csp-in-dev',
      transformIndexHtml(html, ctx) {
        if (ctx.server) {
          // Remove CSP meta tag in dev — it blocks Vite's HMR SharedWorker (blob: URLs)
          return html.replace(
            /<meta http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
            '<!-- CSP meta tag removed in dev mode (see vite.config.ts) -->',
          );
        }
        return html;
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pptxgenjs: ['pptxgenjs'],
          exceljs: ['exceljs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
});
