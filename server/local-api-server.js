/**
 * Local API Server for Development
 * 
 * Runs Vercel serverless functions locally without needing Vercel CLI.
 * This allows testing API routes before deploying to Vercel.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Under concurrently without a TTY, stdin can reach EOF and (on some setups) end the process
// even though the HTTP server is listening — keep stdin open and ignore end.
if (!process.stdin.isTTY) {
  try {
    process.stdin.resume();
    process.stdin.on('end', () => {});
    process.stdin.on('error', () => {});
  } catch {
    /* ignore */
  }
}

const app = express();
const PORT = Number(process.env.LOCAL_API_PORT) || 3001;
/** Bind address — use 127.0.0.1 so Vite’s proxy (same host) matches; override with 0.0.0.0 for LAN. */
const HOST = typeof process.env.LOCAL_API_HOST === 'string' && process.env.LOCAL_API_HOST.trim()
  ? process.env.LOCAL_API_HOST.trim()
  : '127.0.0.1';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version', 'Authorization']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Helper to load and wrap serverless function
async function loadHandler(relativePath) {
  try {
    // Convert to absolute path and then to file:// URL for ES module import
    const absolutePath = join(process.cwd(), relativePath);
    const fileUrl = pathToFileURL(absolutePath).href;
    
    // Import the handler function
    const module = await import(fileUrl);
    const handler = module.default;
    
    return async (req, res) => {
      // Wrap Express req/res to match Vercel format
      const vercelReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body
      };
      
      const vercelRes = {
        status: (code) => {
          res.status(code);
          return vercelRes;
        },
        json: (data) => res.json(data),
        send: (data) => res.send(data),
        end: () => res.end(),
        setHeader: (name, value) => res.setHeader(name, value)
      };
      
      await handler(vercelReq, vercelRes);
    };
  } catch (error) {
    console.error(`Error loading handler for ${relativePath}:`, error);
    return (req, res) => {
      res.status(500).json({ error: 'Failed to load handler', details: error.message });
    };
  }
}

// Load API routes dynamically
async function setupRoutes() {
  // Use relative paths from project root
  // Content remix route
  app.all('/api/ai/content-remix', await loadHandler('api/ai/content-remix.js'));
  app.all('/api/ai/claude', await loadHandler('api/ai/claude.js'));

  // Legacy n8n-generator route
  app.all('/api/ai/n8n-generator', await loadHandler('api/ai/n8n-generator.js'));
  app.all('/api/ai/deep-dive', await loadHandler('api/ai/deep-dive.js'));
  app.all('/api/ai/trend-deep-dive', await loadHandler('api/ai/trend-deep-dive.js'));
  
  // Other AI routes
  app.all('/api/ai/grok', await loadHandler('api/ai/grok.js'));
  app.all('/api/ai/perplexity', await loadHandler('api/ai/perplexity.js'));
  
  // Plan Builder routes
  app.all('/api/plan-builder-proxy', await loadHandler('api/plan-builder-proxy.js'));
  app.all('/api/ignite-engine-proxy', await loadHandler('api/ignite-engine-proxy.js')); // HUTTLE AI: updated 3
  app.all('/api/create-plan-builder-job', await loadHandler('api/create-plan-builder-job.js'));
  app.all('/api/get-job-status', await loadHandler('api/get-job-status.js'));
  
  // Social media routes
  app.all('/api/update-social-media', await loadHandler('api/update-social-media.js'));
  
  // Waitlist route
  app.all('/api/subscribe-waitlist', await loadHandler('api/subscribe-waitlist.js'));
  app.all('/api/save-onboarding', await loadHandler('api/save-onboarding.js'));
  
  // Stripe routes (optional - gracefully handle missing Stripe package)
  try {
    app.all('/api/create-checkout-session', await loadHandler('api/create-checkout-session.js'));
  } catch (error) {
    console.warn('⚠️  Stripe checkout route skipped:', error.message);
    app.all('/api/create-checkout-session', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Install stripe package to enable subscriptions' });
    });
  }
  
  try {
    app.all('/api/create-portal-session', await loadHandler('api/create-portal-session.js'));
  } catch (error) {
    console.warn('⚠️  Stripe portal route skipped:', error.message);
    app.all('/api/create-portal-session', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Install stripe package to enable subscriptions' });
    });
  }
  
  try {
    app.all('/api/stripe-webhook', await loadHandler('api/stripe-webhook.js'));
  } catch (error) {
    console.warn('⚠️  Stripe webhook route skipped:', error.message);
    app.all('/api/stripe-webhook', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Install stripe package to enable subscriptions' });
    });
  }
  
  try {
    app.all('/api/subscription-status', await loadHandler('api/subscription-status.js'));
  } catch (error) {
    console.warn('⚠️  Stripe subscription status route skipped:', error.message);
    app.all('/api/subscription-status', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Install stripe package to enable subscriptions' });
    });
  }

  try {
    app.all('/api/cancel-subscription', await loadHandler('api/cancel-subscription.js'));
  } catch (error) {
    console.warn('⚠️  Cancel subscription route skipped:', error.message);
    app.all('/api/cancel-subscription', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Cancel subscription route unavailable locally' });
    });
  }

  try {
    app.all('/api/create-payment-method-update-session', await loadHandler('api/create-payment-method-update-session.js'));
  } catch (error) {
    console.warn('⚠️  Payment method update route skipped:', error.message);
    app.all('/api/create-payment-method-update-session', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Payment method update route unavailable locally' });
    });
  }

  try {
    app.all('/api/billing-summary', await loadHandler('api/billing-summary.js'));
  } catch (error) {
    console.warn('⚠️  Billing summary route skipped:', error.message);
    app.all('/api/billing-summary', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Billing summary route unavailable locally' });
    });
  }

  try {
    app.all('/api/billing-invoices', await loadHandler('api/billing-invoices.js'));
  } catch (error) {
    console.warn('⚠️  Billing invoices route skipped:', error.message);
    app.all('/api/billing-invoices', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Billing invoices route unavailable locally' });
    });
  }

  try {
    app.all('/api/change-subscription-plan', await loadHandler('api/change-subscription-plan.js'));
  } catch (error) {
    console.warn('⚠️  Change subscription plan route skipped:', error.message);
    app.all('/api/change-subscription-plan', (req, res) => {
      res.status(503).json({ error: 'Stripe not configured', details: 'Change subscription plan route unavailable locally' });
    });
  }
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Local API server is running' });
  });
  
  console.log('✅ API routes loaded');
}

// Start server
setupRoutes().then(() => {
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Local API server running on http://${HOST}:${PORT} (pid ${process.pid})`);
    console.log(`📡 API routes available at http://${HOST}:${PORT}/api/*`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
    console.log('   Keep this process running — if it exits, Vite will return 404/502 for /api/*');
  });
  server.on('error', (err) => {
    console.error(`❌ Cannot bind ${HOST}:${PORT}:`, err.message);
    if (err.code === 'EADDRINUSE') {
      console.error('   Another process is using this port (often a second `npm run dev`). Free it or set LOCAL_API_PORT.');
    }
    process.exit(1);
  });
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

