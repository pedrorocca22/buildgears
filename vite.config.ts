import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // @ts-expect-error - vitest injects `test` at runtime (types from vitest/config)
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 15000,
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['manifold-3d', 'replicad', 'replicad-opencascadejs'],
  },
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})

