#!/bin/bash

# 🧪 Test API Endpoints
# Quick script to verify all API routes are working

echo "🧪 Testing API Endpoints"
echo "========================"
echo ""

# Detect which port is being used
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    BASE_URL="http://localhost:3000"
    echo "✅ Found vercel dev running on port 3000"
elif curl -s http://localhost:3001/health > /dev/null 2>&1; then
    BASE_URL="http://localhost:3001"
    echo "✅ Found local API server running on port 3001"
else
    echo "❌ No API server detected on port 3000 or 3001"
    echo ""
    echo "Please start one of these:"
    echo "  - vercel dev (runs on port 3000)"
    echo "  - npm run dev:local (runs on port 3001)"
    echo "  - npm run dev:api (runs on port 3001)"
    exit 1
fi

echo ""
echo "📡 Testing endpoints at: $BASE_URL"
echo ""

# Test health endpoint
echo "1️⃣  Testing health endpoint..."
if [ "$BASE_URL" = "http://localhost:3001" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" $BASE_URL/health)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ Health check passed: $BODY"
    else
        echo "   ❌ Health check failed (HTTP $HTTP_CODE)"
    fi
else
    echo "   ⚠️  Skipped (vercel dev doesn't have /health endpoint)"
fi

echo ""

# Test plan-builder-proxy (OPTIONS request for CORS)
echo "2️⃣  Testing plan-builder-proxy (CORS preflight)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS $BASE_URL/api/plan-builder-proxy)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "   ✅ CORS preflight passed (HTTP $HTTP_CODE)"
else
    echo "   ❌ CORS preflight failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test ignite-engine-proxy (OPTIONS request for CORS)
echo "3️⃣  Testing ignite-engine-proxy (CORS preflight)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X OPTIONS $BASE_URL/api/ignite-engine-proxy)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "   ✅ CORS preflight passed (HTTP $HTTP_CODE)"
else
    echo "   ❌ CORS preflight failed (HTTP $HTTP_CODE)"
fi

echo ""

# Test with actual POST (will fail due to missing n8n, but should reach the endpoint)
echo "4️⃣  Testing plan-builder-proxy (POST with test data)..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"job_id": "test-job-id"}' \
    $BASE_URL/api/plan-builder-proxy)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "502" ] || [ "$HTTP_CODE" = "504" ]; then
    echo "   ✅ Endpoint reached (may fail at n8n, which is expected)"
elif [ "$HTTP_CODE" = "500" ]; then
    echo "   ❌ Internal server error - check logs"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ Endpoint not found - route not configured"
else
    echo "   ⚠️  Unexpected status code"
fi

echo ""
echo "========================"
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "  1. If all tests passed, open the app in your browser"
echo "  2. Navigate to AI Plan Builder and test the full workflow"
echo "  3. Check browser console and terminal logs for detailed output"
echo ""

