# Huttle AI - Content Creation Platform

A beautiful, AI-powered content creation platform for solopreneurs, small business owners, and content creators.

## 🚀 Quick Start

Your app is ready to use! Here's how to view it:

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Open Your Browser

Visit: **http://localhost:5173/**

That's it! Your Huttle AI app is now running! 🎉

## 📱 Features Built

### ✅ Complete Pages
- **Dashboard** - Overview with all AI widgets (Trending Now, Keywords of the Day, Trend Forecaster, Daily Alerts, etc.)
- **Trend Lab** - AI-powered trend discovery with 5 sub-features (Trend Radar, Audience Insights, Virality Simulator, Remix Engine, Trend Alerts)
- **Smart Calendar** - AI-optimized scheduling & automation
- **Content Library** - Centralized content repository
- **AI Plan Builder** - Generate 7-14 day content calendars
- **Huttle Agent** - AI-powered chat assistant (Beta)
- **Profile** - User account settings
- **Brand Voice** - Customize AI to your brand/niche/industry
- **Subscription** - Stripe-integrated pricing plans (Freemium, Essentials, Pro)
- **Settings** - App preferences and configurations
- **Help** - Support and documentation

### ✅ Key Features
- 🎨 **Beautiful UI** - Clean, modern design with your brand color (#00bad3)
- 📱 **Fully Responsive** - Works perfectly on desktop, tablet, and mobile
- 🎭 **Smooth Animations** - Professional hover effects and transitions
- 🔄 **Dynamic Routing** - All pages connected with React Router
- 👤 **User Personalization** - Dynamic greeting based on user name
- 🎯 **Brand Customization** - All AI features adapt to user's niche/industry
- ♿ **Accessible** - Keyboard navigation and screen reader friendly

## 🔑 Adding Your API Keys

To enable AI features, you need to add your API keys:

### 1. Create a `.env` file in the project root

```bash
# Copy the example file
cp .env.example .env
```

Or manually create `.env` with this content:

```env
# xAI Grok API (for content generation and AI features)
VITE_GROK_API_KEY=your_grok_api_key_here

# Perplexity API (for trend scanning)
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Stripe API (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
VITE_STRIPE_PRICE_ESSENTIALS=price_xxx
VITE_STRIPE_PRICE_PRO=price_yyy
```

### 2. Restart the dev server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 🎨 Design Features

### Color Palette
- **Primary**: #00bad3 (Huttle Cyan)
- **Primary Dark**: #009ab3
- **Primary Light**: #1fc9dd

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

### Hover Interactions
- Cards lift slightly on hover
- Smooth color transitions
- Preview popups on trending items
- Interactive stat cards

## 📂 Project Structure

```
huttle-ai/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Sidebar.jsx
│   │   ├── StatCard.jsx
│   │   ├── TrendCard.jsx
│   │   └── ...
│   ├── pages/            # All application pages
│   │   ├── Dashboard.jsx
│   │   ├── TrendLab.jsx
│   │   └── ...
│   ├── context/          # React Context for state
│   │   ├── AuthContext.jsx
│   │   └── BrandContext.jsx
│   ├── services/         # API integrations
│   │   ├── grokAPI.js
│   │   ├── perplexityAPI.js
│   │   └── stripeAPI.js
│   └── index.css         # Global styles
├── tailwind.config.js    # Tailwind configuration
└── package.json
```

## 🤖 AI Features (Ready to Connect)

### Grok API Usage
- Creative content generation
- Caption writing
- Content quality scoring
- Content plan generation
- Trend remixing

### Perplexity API Usage
- Real-time trend scanning
- Keyword research
- Competitor analysis
- Trend forecasting
- Audience insights

### Stripe Integration
- Subscription management
- Payment processing
- Usage tracking (AI generations)
- Billing portal

## 🎯 How the App Works

### User Flow
1. **Dashboard** - Shows personalized overview
2. **Brand Voice** - User sets their niche/industry
3. **Trend Lab** - Scans trends in user's niche
4. **AI Plan Builder** - Generates content calendar
5. **Smart Calendar** - Schedules posts
6. **Content Library** - Stores all assets

### Personalization
All AI features use data from **Brand Voice** page:
- Niche (e.g., "Medical Spa")
- Industry (e.g., "Healthcare")
- Target Audience (e.g., "Women aged 25-45")
- Brand Voice (e.g., "Professional yet friendly")
- Platforms (Instagram, TikTok, etc.)

## 📱 Mobile Features

- ✅ Collapsible sidebar with hamburger menu
- ✅ Touch-friendly buttons and inputs
- ✅ Swipeable carousels for trends
- ✅ Single-column layouts on small screens
- ✅ Bottom sheet interactions
- ✅ Pull to refresh (ready for implementation)

## 🚧 Next Steps

### To Make It Production-Ready:
1. **Backend API** - Create Express/Node.js server for:
   - Secure API key management
   - Stripe webhooks
   - Database integration (Supabase/PostgreSQL)
   - User authentication

2. **Authentication** - Add:
   - Sign up / Login pages
   - Password reset
   - Social login (Google, etc.)

3. **Database** - Set up Supabase for:
   - User profiles
   - Content storage
   - Analytics tracking
   - Subscription data

4. **Deployment** - Deploy to:
   - Frontend: Vercel or Netlify
   - Backend: Railway, Render, or AWS

## 🛠️ Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🎨 Customization

### Change Brand Colors
Edit `tailwind.config.js`:
```js
colors: {
  'huttle-primary': '#00bad3',    // Change this!
  'huttle-primary-dark': '#009ab3',
  'huttle-primary-light': '#1fc9dd',
}
```

### Modify User Name
Currently hardcoded to "Zach". Edit `src/main.jsx` to change the demo user.

## 📞 Support

Need help? Check out:
- **Help page** in the app
- **[Documentation](./docs/README.md)** - Comprehensive guides and setup instructions
- **Email**: support@huttleai.com (configure this)

## 🎉 You Did It!

Your Huttle AI platform is ready to use! Start exploring, customize it to your needs, and when you're ready, add your API keys to unlock the full AI-powered experience.

**Happy creating! 🚀**

---

Built with ❤️ using React, Tailwind CSS, and cutting-edge AI APIs.
