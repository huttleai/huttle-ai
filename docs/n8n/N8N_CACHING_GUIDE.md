# N8n Caching Implementation Guide

This guide explains how to implement caching in n8n for trend-related requests.

## Overview

Caching is implemented **only for trend-related requests** to reduce API costs and improve response times. User-generated content (captions, hooks, remixes) is always fresh.

## Cached Content Types

✅ **Cache These:**
- Trend forecasts (from Perplexity API)
- Trending topics/keywords
- Audience insights (demographic data)

❌ **Don't Cache These:**
- Captions (user-specific)
- Hooks (user-specific)
- Remixes (user-specific)

## Cache Configuration

### Cache Duration
- **6-12 hours** (trends are relatively stable within a day)
- Configurable based on content type

### Cache Key Structure
```
trend_cache:{contentType}:{niche}:{platform}:{YYYY-MM-DD}
```

**Examples:**
```
trend_cache:trend_forecast:fitness:Instagram:2025-12-14
trend_cache:audience_insight:tech:multi-platform:2025-12-14
```

## Implementation in N8n

### Option 1: Using Redis (Recommended)

1. **Add Redis Node to n8n**
   - Install Redis integration in n8n
   - Configure Redis connection credentials

2. **Cache Check Node** (Before AI Generation)
```javascript
// N8n Function Node: Check Cache
const contentType = $input.item.json.contentType;
const niche = $input.item.json.additionalContext.niche || 'general';
const platform = $input.item.json.platform;
const currentDay = new Date().toISOString().split('T')[0];

// Only cache trend-related requests
const cacheable = ['trend_forecast', 'audience_insight'].includes(contentType);

if (!cacheable) {
  return { cacheable: false };
}

const cacheKey = `trend_cache:${contentType}:${niche}:${platform}:${currentDay}`;

return {
  cacheable: true,
  cacheKey: cacheKey,
  contentType: contentType,
  niche: niche,
  platform: platform
};
```

3. **Redis GET Node**
   - Check if key exists in Redis
   - If exists, return cached data (skip AI generation)
   - If not exists, continue to AI generation

4. **Cache Store Node** (After AI Generation)
```javascript
// N8n Function Node: Store in Cache
const cacheKey = $('Check Cache').item.json.cacheKey;
const aiResponse = $input.item.json;

// Store with 6 hour TTL (21600 seconds)
return {
  key: cacheKey,
  value: JSON.stringify(aiResponse),
  ttl: 21600
};
```

5. **Redis SET Node with TTL**
   - Store the generated content
   - Set expiration to 6 hours (21600 seconds)

### Option 2: Using n8n Built-in Cache

If Redis is not available, use n8n's in-memory caching:

1. **Cache Node** (Check)
```javascript
// Store in workflow static data
const cache = this.getWorkflowStaticData('global');
const cacheKey = `trend_cache:${contentType}:${niche}:${platform}:${currentDay}`;

if (cache[cacheKey]) {
  const cached = cache[cacheKey];
  const cacheAge = Date.now() - cached.timestamp;
  
  // 6 hour cache (21600000 ms)
  if (cacheAge < 21600000) {
    return { 
      cached: true, 
      data: cached.data 
    };
  }
}

return { cached: false, cacheKey: cacheKey };
```

2. **Store in Cache** (After Generation)
```javascript
const cache = this.getWorkflowStaticData('global');
const cacheKey = $('Check Cache').item.json.cacheKey;
const aiResponse = $input.item.json;

cache[cacheKey] = {
  data: aiResponse,
  timestamp: Date.now()
};

return aiResponse;
```

## N8n Workflow Structure

```
START
  ↓
[Parse Request]
  ↓
[Check if Cacheable] → Not Cacheable → [AI Generation] → [Return Response]
  ↓
  Cacheable
  ↓
[Check Redis Cache]
  ↓
  ├─ Cache HIT → [Return Cached Data] → END
  │
  └─ Cache MISS
      ↓
    [AI Generation (Perplexity/Grok)]
      ↓
    [Store in Redis with 6h TTL]
      ↓
    [Return Response]
      ↓
    END
```

## Testing Cache

### Test Cache HIT
```bash
# Make first request (cache miss)
curl -X POST https://your-n8n.com/webhook/generator \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "contentType": "trend_forecast",
    "platform": "Instagram",
    "topic": "fitness trends",
    "additionalContext": {
      "niche": "fitness"
    }
  }'

# Make second request immediately (cache hit - should be < 500ms)
curl -X POST https://your-n8n.com/webhook/generator \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "contentType": "trend_forecast",
    "platform": "Instagram",
    "topic": "fitness trends",
    "additionalContext": {
      "niche": "fitness"
    }
  }'
```

### Verify Cache Metrics
- First request: 10-15 seconds (cache miss + AI generation)
- Second request: <500ms (cache hit)
- Check Redis: `KEYS trend_cache:*`
- Check TTL: `TTL trend_cache:trend_forecast:fitness:Instagram:2025-12-14`

## Cache Invalidation

### Manual Invalidation
```bash
# Delete specific cache key
redis-cli DEL "trend_cache:trend_forecast:fitness:Instagram:2025-12-14"

# Delete all trend cache
redis-cli KEYS "trend_cache:*" | xargs redis-cli DEL
```

### Automatic Invalidation
- TTL automatically expires keys after 6 hours
- New day automatically creates new cache keys (date in key)

## Monitoring

### Metrics to Track
- Cache hit rate (% of requests served from cache)
- Average response time (cached vs uncached)
- Cache size/memory usage
- Most cached content types

### N8n Metrics Node
```javascript
// Track cache hit/miss
const isCacheHit = $('Check Redis Cache').item.json.found;

// Log to monitoring service
return {
  metric: 'cache_hit',
  value: isCacheHit ? 1 : 0,
  contentType: $input.item.json.contentType,
  timestamp: new Date().toISOString()
};
```

## Best Practices

1. **Cache Key Design**
   - Include all relevant parameters (niche, platform, date)
   - Keep keys short but descriptive
   - Use consistent naming convention

2. **TTL Selection**
   - 6 hours for trends (good balance)
   - Shorter for rapidly changing content
   - Longer for stable demographic data

3. **Error Handling**
   - If cache read fails, fallback to AI generation
   - If cache write fails, still return AI response
   - Log cache errors for monitoring

4. **Memory Management**
   - Monitor Redis memory usage
   - Set max memory policy (e.g., `allkeys-lru`)
   - Regular cleanup of expired keys

## Environment Variables

Add to n8n environment:
```bash
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
CACHE_TTL_SECONDS=21600  # 6 hours
```

## Troubleshooting

### Cache Not Working
1. Check Redis connection
2. Verify cache key format
3. Check TTL expiration
4. Review n8n logs for errors

### Slow Performance
1. Monitor cache hit rate
2. Check Redis latency
3. Verify network connection
4. Review cache key structure

### Stale Data
1. Reduce TTL if needed
2. Implement manual cache invalidation
3. Add cache version to key structure






