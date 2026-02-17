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

const app = express();
const PORT = process.env.LOCAL_API_PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 'X-Api-Version', 'Authorization']
}));

app.use(express.json());
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
  // n8n-generator route
  app.all('/api/ai/n8n-generator', await loadHandler('api/ai/n8n-generator.js'));
  app.all('/api/ai/trend-deep-dive', await loadHandler('api/ai/trend-deep-dive.js'));
  
  // Other AI routes
  app.all('/api/ai/grok', await loadHandler('api/ai/grok.js'));
  app.all('/api/ai/perplexity', await loadHandler('api/ai/perplexity.js'));
  
  // Plan Builder routes
  app.all('/api/plan-builder-proxy', await loadHandler('api/plan-builder-proxy.js'));
  app.all('/api/viral-blueprint-proxy', await loadHandler('api/viral-blueprint-proxy.js'));
  app.all('/api/create-plan-builder-job', await loadHandler('api/create-plan-builder-job.js'));
  app.all('/api/get-job-status', await loadHandler('api/get-job-status.js'));
  
  // Social media routes
  app.all('/api/update-social-media', await loadHandler('api/update-social-media.js'));
  
  // Waitlist route
  app.all('/api/subscribe-waitlist', await loadHandler('api/subscribe-waitlist.js'));
  
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
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Local API server is running' });
  });
  
  console.log('✅ API routes loaded');
}

// Start server
setupRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Local API server running on http://localhost:${PORT}`);
    console.log(`📡 API routes available at http://localhost:${PORT}/api/*`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

