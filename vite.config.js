import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fastModel = (env.GROK_MODEL_NON_REASONING || 'grok-4-1-fast-non-reasoning').trim()
  const reasoningModel = (env.GROK_MODEL_REASONING || 'grok-4-1-fast-reasoning').trim()

  return {
    plugins: [react()],
    define: {
      __GROK_FAST_MODEL__: JSON.stringify(fastModel),
      __GROK_REASONING_MODEL__: JSON.stringify(reasoningModel),
    },
    server: {
      port: 5173,
      hmr: {
        overlay: true
      },
      watch: {
        usePolling: true,
        interval: 100
      },
      // Proxy API requests to local API server
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
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
  }
})
