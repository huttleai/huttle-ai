# Trend Deep Dive Setup Guide

Trend Lab Deep Dive no longer uses an n8n webhook.

## Current Setup

- The frontend calls `/api/ai/deep-dive`
- The Vercel function calls Perplexity Sonar Pro directly
- The required server-side environment variable is `PERPLEXITY_API_KEY`

## Local Development

Add this to your local env file:

```bash
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

Then restart your local API server or Vite dev server.

## Production

Set `PERPLEXITY_API_KEY` in the Vercel dashboard for Production, Preview, and Development environments.

## Expected Response Shape

The Deep Dive UI expects:

```json
{
  "success": true,
  "report": {},
  "citations": [],
  "metadata": {}
}
```

`report` should include the structured fields rendered by `TrendDiscoveryHub`, and `citations` should be an array of URL strings.
4. `[N8N_WORKFLOW] getTrendDeepDive error` - Shows any errors

Also check n8n workflow execution history for detailed error messages.







