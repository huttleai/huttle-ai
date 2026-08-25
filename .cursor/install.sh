#!/usr/bin/env bash
# Idempotent Cloud Agent install script for Huttle AI.
# Runs after the repo is checked out. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing npm dependencies"
npm install --no-audit --no-fund

# The frontend imports src/config/supabase.js at boot, which THROWS if
# VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. When real secrets are
# injected as environment variables (via Cloud Agent Secrets) Vite picks them up
# and we leave things alone. Otherwise, drop in a placeholder .env so the dev
# server can still boot and render the public app for verification.
if [ ! -f .env ] && [ -z "${VITE_SUPABASE_URL:-}" ]; then
  echo "==> No .env and no VITE_SUPABASE_URL in env; writing placeholder .env for local boot"
  cat > .env <<'EOF'
# Auto-generated placeholder .env (no real secrets present).
# Replace via Cloud Agent Secrets or real values to exercise backends.
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-anon-key
VITE_APP_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3001/api
LOCAL_API_HOST=127.0.0.1
LOCAL_API_PORT=3001
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SERVICE_ROLE_KEY=placeholder-service-role-key
EOF
else
  echo "==> Existing .env or VITE_SUPABASE_URL detected; leaving env config untouched"
fi

echo "==> Install complete"
