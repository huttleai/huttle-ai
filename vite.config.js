import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  cacheDir: 'node_modules/.vite',
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
