import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/simple-kakuro/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Simple Kakuro',
        short_name: 'Kakuro',
        description: 'Mobile-first Kakuro with notes, cheatsheet, and three difficulty levels',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        start_url: '/simple-kakuro/',
        scope: '/simple-kakuro/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        globIgnores: ['**/puzzles/**'],
        navigateFallback: '/simple-kakuro/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/puzzles/') && url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'puzzle-banks',
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
