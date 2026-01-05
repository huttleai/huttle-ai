#!/bin/bash

echo "🔍 Debugging AI Plan Builder Button"
echo "===================================="
echo ""

# Check if correct server is running
echo "1️⃣ Checking servers..."
if lsof -i :3000 2>/dev/null | grep LISTEN > /dev/null; then
    echo "   ✅ Server running on port 3000 (correct - use this one!)"
    echo "      Access: http://localhost:3000/plan-builder"
else
    echo "   ❌ No server on port 3000"
    echo "      Start with: vercel dev"
fi

if lsof -i :5190 2>/dev/null | grep LISTEN > /dev/null; then
    echo "   ⚠️  Server running on port 5190 (wrong - stop this one!)"
    echo "      This server doesn't have API routes"
else
    echo "   ✅ No server on port 5190 (good)"
fi

echo ""

# Check environment variables
echo "2️⃣ Checking environment variables..."
if [ -f ".env" ]; then
    if grep -q "VITE_N8N_PLAN_BUILDER_WEBHOOK" .env; then
        WEBHOOK_URL=$(grep "VITE_N8N_PLAN_BUILDER_WEBHOOK" .env | cut -d'=' -f2)
        echo "   ✅ VITE_N8N_PLAN_BUILDER_WEBHOOK found"
        echo "      URL: $WEBHOOK_URL"
    else
        echo "   ❌ VITE_N8N_PLAN_BUILDER_WEBHOOK missing in .env"
    fi
    
    if grep -q "VITE_SUPABASE_URL" .env; then
        echo "   ✅ VITE_SUPABASE_URL found"
    else
        echo "   ❌ VITE_SUPABASE_URL missing in .env"
    fi
else
    echo "   ❌ No .env file found"
    echo "      Run: ./create-env.sh"
fi

echo ""

# Test API endpoint
echo "3️⃣ Testing API endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/plan-builder-proxy \
  -H "Content-Type: application/json" \
  -d '{"job_id":"test-debug-00000000-0000-0000-0000-000000000000"}' 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API endpoint responding correctly (HTTP 200)"
    echo "      Response: $BODY"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Cannot connect to port 3000"
    echo "      Make sure vercel dev is running"
else
    echo "   ⚠️  API returned HTTP $HTTP_CODE"
    echo "      Response: $BODY"
fi

echo ""

# Check Supabase connection (requires running server)
echo "4️⃣ Checking authentication..."
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ℹ️  To test auth, open browser console and run:"
    echo "      const { data } = await supabase.auth.getSession();"
    echo "      console.log('User:', data.session?.user?.email);"
else
    echo "   ⚠️  Skipped (API not responding)"
fi

echo ""
echo "===================================="
echo "📊 Summary"
echo "===================================="
echo ""

if lsof -i :3000 2>/dev/null | grep LISTEN > /dev/null; then
    echo "✅ Server Status: READY"
    echo "   Use: http://localhost:3000/plan-builder"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Open http://localhost:3000 in your browser"
    echo "   2. Navigate to AI Plan Builder"
    echo "   3. Fill the form (select at least one platform!)"
    echo "   4. Click 'Generate AI Plan'"
    echo "   5. Open browser console (F12) to see logs"
    echo ""
    echo "📝 Expected Console Logs:"
    echo "   [PlanBuilder] ====== WEBHOOK REQUEST DEBUG ======"
    echo "   [PlanBuilder] Using proxy endpoint: /api/plan-builder-proxy"
    echo "   [PlanBuilder] Job ID: <uuid>"
    echo "   [PlanBuilder] Response status: 200 OK"
else
    echo "❌ Server Status: NOT RUNNING"
    echo ""
    echo "🎯 Fix:"
    echo "   1. Run: vercel dev"
    echo "   2. Wait for 'Ready! Available at http://localhost:3000'"
    echo "   3. Open http://localhost:3000/plan-builder"
fi

echo ""

if lsof -i :5190 2>/dev/null | grep LISTEN > /dev/null; then
    echo "⚠️  WARNING: Server on port 5190 is running"
    echo "   This server doesn't have API routes!"
    echo "   Stop it with Ctrl+C in terminal 24"
    echo ""
fi

echo "===================================="
echo ""


