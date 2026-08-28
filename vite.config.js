import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Prefer process.env so Playwright-spawned dev can set LOCAL_API_PORT without editing .env.
  const localApiPort =
    String(process.env.LOCAL_API_PORT || env.LOCAL_API_PORT || env.VITE_LOCAL_API_PORT || '3001').trim() ||
    '3001'
  const localApiHost =
    String(process.env.LOCAL_API_HOST || env.LOCAL_API_HOST || '127.0.0.1').trim() || '127.0.0.1'
  // Grok model id + reasoning effort live in src/config/grokConfig.js (single source of truth).

  return {
    plugins: [react()],
    server: {
      // Playwright polls 127.0.0.1; default Vite "localhost" can be IPv6-only on some macOS setups.
      host: process.env.PLAYWRIGHT_VITE_PORT?.trim() ? '127.0.0.1' : false,
      // Playwright E2E can set PLAYWRIGHT_VITE_PORT when 5173 is already in use.
      // strictPort avoids silent port drift (Playwright's webServer.url would never match).
      port: Number(process.env.PLAYWRIGHT_VITE_PORT || 5173) || 5173,
      strictPort: Boolean(process.env.PLAYWRIGHT_VITE_PORT?.trim()),
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
          // 127.0.0.1 avoids IPv6 localhost (::1) vs IPv4-only listen mismatches on some macOS setups
          target: `http://${localApiHost}:${localApiPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    cacheDir: 'node_modules/.vite',
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['framer-motion', 'lucide-react'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    }
  }
})
