# Deep Dive Configuration Check

Trend Lab Deep Dive now runs through the direct serverless route at `/api/ai/deep-dive`.

## What To Verify

1. `PERPLEXITY_API_KEY` is set locally or in Vercel.
2. The request reaches `/api/ai/deep-dive`.
3. The response includes:

```json
{
  "success": true,
  "report": {},
  "citations": [],
  "metadata": {}
}
```

## Common Failure Cases

- `Authentication required`
- `Deep Dive is unavailable because the Perplexity API key is not configured.`
- `Deep Dive request timed out. Try narrowing the topic or platform focus.`

## Quick Manual Test

Call the app route directly instead of a webhook:

```javascript
fetch('/api/ai/deep-dive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer <supabase-access-token>',
  },
  body: JSON.stringify({
    topic: 'AI content workflows',
    niche: 'creator education',
    platform: 'Instagram, TikTok, X',
    userId: 'test-user',
  }),
})
  .then((response) => response.json())
  .then(console.log)
  .catch(console.error);
```







