import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// VITE_BASE lets the same build live under a sub-path, e.g. /gym-app/ on GitHub Pages.
const base = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Gym',
        short_name: 'Gym',
        description: 'Personal workout log: templates, rest timer, progress and body-part strength.',
        display: 'standalone',
        start_url: base,
        scope: base,
        orientation: 'portrait',
        background_color: '#0B0B0C',
        theme_color: '#0B0B0C',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'] },
    }),
  ],
  server: { host: true, port: 5173 },
})
