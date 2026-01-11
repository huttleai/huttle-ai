#!/bin/bash

# 🔑 Create .env file for Huttle AI
# This script will guide you through creating the .env file

echo "🔑 Environment Variables Setup"
echo "=============================="
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/n): " overwrite
    
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
        echo "Cancelled. Existing .env file kept."
        exit 0
    fi
    
    # Backup existing .env
    cp .env .env.backup
    echo "✅ Backed up existing .env to .env.backup"
    echo ""
fi

# Create .env file
cat > .env << 'EOF'
# ============================================================================
# SUPABASE CONFIGURATION (REQUIRED)
# ============================================================================
# Your Supabase project URL (from project settings)
VITE_SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co

# Supabase Anonymous Key (from project settings → API → Project API keys → anon)
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Supabase URL for server-side functions
SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co

# Supabase Service Role Key (from project settings → API → Project API keys → service_role)
# ⚠️ KEEP THIS SECRET - Never expose to client
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ============================================================================
# N8N WEBHOOKS (REQUIRED FOR AI FEATURES)
# ============================================================================
# n8n webhook for AI Plan Builder (async job processing)
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://huttleai.app.n8n.cloud/webhook/plan-builder-async

# n8n webhook for Viral Blueprint generation
VITE_N8N_VIRAL_BLUEPRINT_WEBHOOK=https://huttleai.app.n8n.cloud/webhook-test/viral-blueprint

# ============================================================================
# API CONFIGURATION
# ============================================================================
# API base URL (use /api for relative paths, works with both Vite proxy and Vercel)
VITE_API_URL=/api

# Local API server port (only used with npm run dev:local)
LOCAL_API_PORT=3001

# ============================================================================
# DEVELOPMENT SETTINGS
# ============================================================================
# Node environment
NODE_ENV=development

# Skip authentication in DEV mode (set to 'true' only for local testing)
# WARNING: Never set this to 'true' in production
# VITE_SKIP_AUTH=false

# ============================================================================
# AI API KEYS (OPTIONAL - for full feature set)
# ============================================================================
# xAI Grok API Key (for content generation and AI chat)
# Get from: https://console.x.ai
VITE_GROK_API_KEY=your_grok_api_key_here

# Perplexity API Key (for trend discovery and research)
# Get from: https://www.perplexity.ai/settings/api
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here

# ============================================================================
# STRIPE PAYMENT CONFIGURATION (OPTIONAL - for subscriptions)
# ============================================================================
# Stripe Publishable Key (from Stripe dashboard → Developers → API keys)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here

# Stripe Price IDs (from Stripe dashboard → Products)
VITE_STRIPE_PRICE_ESSENTIALS=price_xxx
VITE_STRIPE_PRICE_PRO=price_yyy

# Stripe Secret Key (for server-side - from Stripe dashboard → Developers → API keys)
# ⚠️ KEEP THIS SECRET - Never expose to client
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Stripe Webhook Secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ============================================================================
# NOTES
# ============================================================================
# - Variables with VITE_ prefix are exposed to the frontend (client-side)
# - Variables without VITE_ are only available to serverless functions (server-side)
# - Never commit this file to version control (it's in .gitignore)
# - For production, set these in Vercel environment variables
# - After creating/editing this file, restart your dev server
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Open .env file in your editor:"
echo "   code .env"
echo "   (or use your preferred editor)"
echo ""
echo "2. Replace these placeholder values:"
echo ""
echo "   REQUIRED:"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "   Get these from:"
echo "   https://supabase.com/dashboard/project/khtaqmfhlmnwwzkpfgev/settings/api"
echo ""
echo "   OPTIONAL (for full features):"
echo "   - VITE_GROK_API_KEY (for AI content generation)"
echo "   - VITE_PERPLEXITY_API_KEY (for trend discovery)"
echo "   - Stripe keys (for payment processing)"
echo ""
echo "3. Save the file"
echo ""
echo "4. Restart your dev server:"
echo "   - If using vercel dev: Ctrl+C and run 'vercel dev' again"
echo "   - If using local: Ctrl+C and run 'npm run dev:local' again"
echo ""
echo "5. Test the API endpoints:"
echo "   ./test-api.sh"
echo ""
echo "================================================"
echo "⚠️  SECURITY REMINDER:"
echo "   - Never commit .env to git (it's already in .gitignore)"
echo "   - Never share your service_role_key or secret keys"
echo "   - Keep your .env file secure and private"
echo "================================================"
echo ""



