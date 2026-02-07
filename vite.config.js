import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['patrolscanimg.png', 'robots.txt'],
      manifest: {
        name: 'Patrol Scan',
        short_name: 'PatrolScan',
        description: 'Patrol Management System',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/guard-login',
        id: '/',
        categories: ['business', 'productivity', 'security'],
        shortcuts: [
          {
            name: 'Scan Checkpoint',
            short_name: 'Scan',
            description: 'Quickly scan a QR code',
            url: '/scan',
            icons: [{ src: '/patrolscanimg.png', sizes: '192x192' }]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'View patrol activity',
            url: '/dashboard',
            icons: [{ src: '/patrolscanimg.png', sizes: '192x192' }]
          }
        ],
        icons: [
          {
            src: 'patrolscanimg.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'patrolscanimg.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'patrolscanimg.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'documents',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'style' ||
                                        request.destination === 'script' ||
                                        request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      },
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  base: './',
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
})
