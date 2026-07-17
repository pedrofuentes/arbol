import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { VitePWA } from 'vite-plugin-pwa';
import { configDefaults } from 'vitest/config';

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
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Arbol',
        short_name: 'Arbol',
        description: 'Arbol — Interactive org chart editor for the browser',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0c1222',
        background_color: '#0c1222',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        globIgnores: ['big-org-1000.csv', 'arbol.config.example.json'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pptxgenjs')) return 'pptxgenjs';
          if (id.includes('node_modules/exceljs')) return 'exceljs';
        },
      },
    },
  },
  test: {
    exclude: [...configDefaults.exclude, '.worktrees/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
});
