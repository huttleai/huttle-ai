import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Align with api/ai/grok.js — xAI expects hyphens (4-1), not dots (4.1). */
function normalizeGrokModelIdForClient(modelId) {
  const t = String(modelId || '').trim()
  if (!t) return t
  const lower = t.toLowerCase()
  const map = new Map([
    ['grok-4.1-fast-reasoning', 'grok-4-1-fast-reasoning'],
    ['grok-4.1-fast-non-reasoning', 'grok-4-1-fast-non-reasoning'],
    ['grok-4.1-fast', 'grok-4-1-fast'],
    ['grok-4-fast-reasoning', 'grok-4-1-fast-reasoning'],
    ['grok-4-fast-non-reasoning', 'grok-4-1-fast-non-reasoning'],
  ])
  if (map.has(lower)) return map.get(lower)
  if (/^grok-4\.1-/i.test(t)) return t.replace(/^grok-4\.1-/i, 'grok-4-1-')
  if (/grok-4\.1/i.test(t)) return t.replace(/grok-4\.1/gi, 'grok-4-1')
  return t
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Prefer process.env so Playwright-spawned dev can set LOCAL_API_PORT without editing .env.
  const localApiPort =
    String(process.env.LOCAL_API_PORT || env.LOCAL_API_PORT || env.VITE_LOCAL_API_PORT || '3001').trim() ||
    '3001'
  const localApiHost =
    String(process.env.LOCAL_API_HOST || env.LOCAL_API_HOST || '127.0.0.1').trim() || '127.0.0.1'
  // Keep client-baked ids aligned with api/ai/grok.js resolveGrokModelId() so a single
  // GROK_CHAT_MODEL / GROK_MODEL in .env works for both Vite and local-api-server.
  const fastModel = normalizeGrokModelIdForClient(
    env.GROK_FAST_MODEL
    || env.GROK_MODEL_NON_REASONING
    || env.GROK_CHAT_MODEL
    || env.GROK_MODEL
    || 'grok-4-1-fast-non-reasoning',
  )
  const reasoningModel = normalizeGrokModelIdForClient(
    env.GROK_REASONING_MODEL
    || env.GROK_MODEL_REASONING
    || env.GROK_CHAT_MODEL
    || env.GROK_FAST_MODEL
    || env.GROK_MODEL_NON_REASONING
    || env.GROK_MODEL
    || 'grok-4-1-fast-reasoning',
  )

  return {
    plugins: [react()],
    define: {
      __GROK_FAST_MODEL__: JSON.stringify(fastModel),
      __GROK_REASONING_MODEL__: JSON.stringify(reasoningModel),
    },
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
