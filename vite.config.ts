import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function readBaseVersionMeta() {
  const fallback = {
    version: 'v2.6.0-OTA',
    buildId: 'ais-build-2026-11-26-ota',
    builtAt: new Date().toISOString(),
    changelog: 'Actualización automática OTA para dispositivos instalados.'
  };
  try {
    const versionFile = path.resolve(__dirname, 'version.json');
    if (fs.existsSync(versionFile)) {
      const parsed = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
      return { ...fallback, ...parsed };
    }
  } catch {
    // use fallback
  }
  return fallback;
}

function emitDistVersionPlugin(buildMeta: {
  version: string;
  buildId: string;
  builtAt: string;
  changelog: string;
}): Plugin {
  return {
    name: 'pii-lcc-emit-dist-version',
    apply: 'build',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(distDir, 'version.json'),
          JSON.stringify(buildMeta, null, 2),
          'utf-8'
        );
      } catch (err) {
        console.warn('[Build] Could not write dist/version.json:', err);
      }
    }
  };
}

export default defineConfig(({ command }) => {
  const baseMeta = readBaseVersionMeta();
  const nowIso = new Date().toISOString();
  // Every production build receives a unique deterministic fingerprint written to both
  // the compiled client bundle and dist/version.json so all installed PWAs detect updates automatically.
  const activeBuildMeta =
    command === 'build'
      ? {
          version: baseMeta.version,
          buildId: `${baseMeta.buildId}-${Date.now()}`,
          builtAt: nowIso,
          changelog: baseMeta.changelog
        }
      : baseMeta;

  return {
    define: {
      __PII_LCC_APP_VERSION__: JSON.stringify(activeBuildMeta.version),
      __PII_LCC_BUILD_ID__: JSON.stringify(activeBuildMeta.buildId),
      __PII_LCC_BUILT_AT__: JSON.stringify(activeBuildMeta.builtAt),
      __PII_LCC_CHANGELOG__: JSON.stringify(activeBuildMeta.changelog)
    },
    plugins: [
      react(),
      tailwindcss(),
      emitDistVersionPlugin(activeBuildMeta),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'tactical-icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'default-interface-bg.jpg',
          'dashboard-room.svg',
          'escudo-eceme-negro.svg',
          'backgrounds/default_MOD_CEO.png',
          'backgrounds/default_MOD_FUSION.png',
          'backgrounds/default_MOD_BUSQUEDA.png',
          'backgrounds/default_MOD_PATRULLAS.png'
        ],
        manifest: {
          id: '/',
          name: 'Plataforma Integrada de Inteligencia para la LCC',
          short_name: 'PII-LCC',
          description: 'Terminal Táctico Autónomo de Inteligencia Militar para la Línea de Control Clandestino',
          theme_color: '#050505',
          background_color: '#050505',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['utilities', 'security', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // Ensure installed PWAs and Vercel deployments activate new versions immediately
          // and NEVER serve stale index.html from precache when online.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallback: null,
          maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
          globPatterns: [
            'assets/*.{js,css}',
            '**/*.{ico,svg,woff,woff2}',
            'pwa-*.png',
            'favicon.png',
            'apple-touch-icon.png',
            'default-interface-bg.jpg',
            'backgrounds/default_*.png'
          ],
          globIgnores: ['**/index.html', '**/version.json', '**/server.cjs*', '**/assets/aistudio/**'],
          runtimeCaching: [
            {
              // Never cache live API endpoints or version manifests
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') || url.pathname === '/version.json',
              handler: 'NetworkOnly',
            },
            {
              // Always fetch latest HTML navigation from network first (Vercel / AI Studio), falling back to cache only offline
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pii-lcc-pages-cache-v2',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
