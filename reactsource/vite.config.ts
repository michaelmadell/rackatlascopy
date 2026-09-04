import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(),react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
})
