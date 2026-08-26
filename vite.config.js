import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // A shell-exported VITE_API_URL (used to point an isolated E2E instance at
  // its own backend — see tests/e2e/helpers/env.ts) must win over whatever
  // .env declares, since dotenv's default precedence otherwise favors the
  // .env file over process.env and silently sends the app back to the
  // regular dev backend — confirmed the hard way while wiring up Phase 4's
  // E2E environment (see docs/compliance-engine-known-issues.md).
  define: process.env.VITE_API_URL
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL) }
    : {},
  server: {
    port: Number(process.env.VITE_DEV_PORT) || 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia')) return 'vendor'
            if (id.includes('vue-i18n')) return 'i18n'
            if (id.includes('chart.js') || id.includes('vue-chartjs')) return 'charts'
          }
        },
      },
    },
  },
})
