#!/bin/bash

# 🔧 Quick Setup Script for Huttle AI Development
# This script helps you set up the development environment

echo "🚀 Huttle AI - Development Setup"
echo "================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    echo ""
    echo "📝 Creating .env file from template..."
    echo ""
    
    cat > .env << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_URL=https://khtaqmfhlmnwwzkpfgev.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Webhook URLs
VITE_N8N_PLAN_BUILDER_WEBHOOK=https://huttleai.app.n8n.cloud/webhook/plan-builder-async
VITE_N8N_IGNITE_ENGINE_WEBHOOK=https://huttleai.app.n8n.cloud/webhook-test/ignite-engine

# API Configuration
VITE_API_URL=/api
LOCAL_API_PORT=3001

# Development Mode
NODE_ENV=development

# xAI Grok API (server-side — used by local/Vercel /api/ai/* proxies only)
GROK_API_KEY=your_grok_api_key_here

# Perplexity API (server-side)
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Stripe API
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
VITE_STRIPE_PRICE_ESSENTIALS=price_xxx
VITE_STRIPE_PRICE_PRO=price_yyy
EOF
    
    echo "✅ .env file created!"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your actual API keys:"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - GROK_API_KEY (optional, server-side)"
    echo "   - PERPLEXITY_API_KEY (optional, server-side)"
    echo "   - Stripe keys (optional)"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Check which dev mode to use
echo "🎯 Choose your development mode:"
echo ""
echo "1) vercel dev (RECOMMENDED)"
echo "   - Handles both frontend and API routes automatically"
echo "   - Most similar to production"
echo "   - Loads environment variables from Vercel"
echo "   - URL: http://localhost:3000"
echo ""
echo "2) Local API server (npm run dev:local)"
echo "   - Runs local API server + Vite frontend"
echo "   - Good for offline development"
echo "   - URL: http://localhost:5173"
echo ""
echo "3) Separate servers (for debugging)"
echo "   - API server and frontend in separate terminals"
echo "   - Best for seeing detailed API logs"
echo "   - URLs: http://localhost:5173 (frontend), http://localhost:3001 (API)"
echo ""

read -p "Enter your choice (1, 2, or 3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting with vercel dev..."
        echo ""
        echo "If you haven't linked your project yet, run:"
        echo "  vercel link"
        echo ""
        echo "Starting in 3 seconds..."
        sleep 3
        vercel dev
        ;;
    2)
        echo ""
        echo "🚀 Starting with local API server..."
        echo ""
        echo "This will start:"
        echo "  - Local API server on http://localhost:3001"
        echo "  - Vite frontend on http://localhost:5173"
        echo ""
        echo "Starting in 3 seconds..."
        sleep 3
        npm run dev:local
        ;;
    3)
        echo ""
        echo "🚀 Starting API server only..."
        echo ""
        echo "⚠️  In another terminal, run: npm run dev"
        echo ""
        echo "Starting in 3 seconds..."
        sleep 3
        npm run dev:api
        ;;
    *)
        echo ""
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac






