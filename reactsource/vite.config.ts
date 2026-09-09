import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@patchdocs/ui': path.resolve(__dirname, './src/patchdocs-ui'),
      '@patchdocs/constants': path.resolve(__dirname, './src/shims/constants.ts'),
      '@auth0/auth0-react': path.resolve(__dirname, './src/shims/auth0.tsx'),
      'libphonenumber-js': path.resolve(__dirname, './src/shims/libphonenumber.ts'),
      'jsvat': path.resolve(__dirname, './src/shims/jsvat.ts'),
      '@lottiefiles/dotlottie-react': path.resolve(__dirname, './src/shims/dotlottie.tsx'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('2026.9.0'),
  },
  server: {
    port: 5178,
  },
  optimizeDeps: {
    // maplibre-gl spawns its tile-parsing Worker at runtime via
    // `new Worker(new URL('./maplibre-gl-worker...', import.meta.url))`.
    // Vite's dep pre-bundler never discovers that dynamic worker chunk, so
    // in dev mode the browser requests `.vite/deps/maplibre-gl-worker.mjs`
    // and the request just hangs (stays "pending" forever) — the worker
    // never loads, so tiles never get parsed/painted, and since it's not a
    // network error, nothing ever surfaces in the console. Excluding the
    // package from pre-bundling makes Vite serve it as native ESM straight
    // from node_modules, so the worker URL resolves against the real file
    // and loads correctly.
    exclude: ['maplibre-gl'],
  },
})
