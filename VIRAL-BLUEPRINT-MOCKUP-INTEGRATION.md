# Adding iPhone Mockup to Viral Blueprint Page

## Quick Integration Example

Here's how to add the mobile mockup showcase to your Viral Blueprint page.

### Option 1: Add as a Section (Recommended)

Add this code to `src/pages/ViralBlueprint.jsx` after the results section (around line 1453):

```jsx
import IPhoneMockup from '../components/IPhoneMockup';

// ... existing imports ...

export default function ViralBlueprint() {
  // ... existing code ...

  return (
    <div className="flex-1 min-h-screen bg-gray-50/50 ml-0 lg:ml-64 pt-20 px-4 md:px-6 lg:px-8 pb-12">
      {/* ... existing content ... */}

      {/* ADD THIS NEW SECTION - Mobile Experience Showcase */}
      <div className="relative z-10 max-w-6xl mx-auto mt-20 mb-12">
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left: Description */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">
                  Mobile Optimized
                </span>
              </div>
              
              <h2 className="text-4xl font-display font-bold text-gray-900">
                Perfect on Every Device
              </h2>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                The Viral Blueprint Generator is fully optimized for mobile devices. 
                Generate viral content strategies on the go, anywhere, anytime.
              </p>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Touch-optimized interface</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">Fast AI generation</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-gray-700">One-tap copy to clipboard</span>
                </li>
              </ul>
            </div>

            {/* Right: iPhone Mockup */}
            <div className="flex justify-center">
              <IPhoneMockup 
                imageSrc="/viral-blueprint-mobile.png" 
                imageAlt="Viral Blueprint Generator - Mobile Experience"
                size="medium"
                showBackground={false}
              />
            </div>

          </div>
        </div>
      </div>
      {/* END NEW SECTION */}

      {/* ... rest of existing content ... */}
    </div>
  );
}
```

### Option 2: Add at the Top (Hero Section)

Add this right after the header section (around line 890):

```jsx
{/* Mobile Preview Hero */}
<div className="relative z-10 max-w-6xl mx-auto mb-12">
  <div className="text-center mb-8">
    <h2 className="text-3xl font-bold text-gray-900 mb-3">
      Works Beautifully on Mobile
    </h2>
    <p className="text-gray-600">
      Generate viral blueprints from any device
    </p>
  </div>
  
  <div className="flex justify-center">
    <IPhoneMockup 
      imageSrc="/viral-blueprint-mobile.png" 
      imageAlt="Viral Blueprint Generator Mobile View"
      size="large"
    />
  </div>
</div>
```

### Option 3: Add in Results Section

Add this within the results section (after line 1160):

```jsx
{generatedBlueprint && hasAccess && (
  <div id="blueprint-results" className="space-y-8 animate-reveal-up">
    
    {/* ADD THIS - Mobile Preview Card */}
    <div className="glass-panel rounded-2xl p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            📱 Mobile-Ready Blueprint
          </h3>
          <p className="text-gray-600 mb-4">
            Your blueprint looks great on mobile devices. Access it anywhere, 
            copy content with one tap, and create viral content on the go.
          </p>
          <div className="flex gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              Touch Optimized
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              Fast Loading
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <IPhoneMockup 
            imageSrc="/viral-blueprint-mobile.png" 
            imageAlt="Mobile Blueprint View"
            size="small"
            showBackground={false}
          />
        </div>
      </div>
    </div>
    {/* END MOBILE PREVIEW CARD */}

    {/* ... existing results sections ... */}
  </div>
)}
```

---

## Full Example: Feature Section Component

Create a reusable component for the mobile showcase:

**File:** `src/components/MobileShowcase.jsx`

```jsx
import IPhoneMockup from './IPhoneMockup';
import { Check, Sparkles, Smartphone } from 'lucide-react';

export default function MobileShowcase({ 
  title = "Perfect on Every Device",
  description = "Fully optimized for mobile devices. Generate viral content strategies on the go.",
  imageSrc = "/viral-blueprint-mobile.png",
  imageAlt = "Mobile view",
  features = [
    "Touch-optimized interface",
    "Fast AI generation",
    "One-tap copy to clipboard"
  ]
}) {
  return (
    <div className="glass-panel rounded-3xl p-8 md:p-12">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left: Description */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full">
            <Smartphone className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-bold text-orange-600 uppercase tracking-wider">
              Mobile Optimized
            </span>
          </div>
          
          <h2 className="text-4xl font-display font-bold text-gray-900">
            {title}
          </h2>
          
          <p className="text-lg text-gray-600 leading-relaxed">
            {description}
          </p>
          
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: iPhone Mockup */}
        <div className="flex justify-center">
          <IPhoneMockup 
            imageSrc={imageSrc}
            imageAlt={imageAlt}
            size="medium"
            showBackground={false}
          />
        </div>

      </div>
    </div>
  );
}
```

Then use it in your page:

```jsx
import MobileShowcase from '../components/MobileShowcase';

// In your JSX:
<MobileShowcase 
  title="Blueprint Generator on Mobile"
  description="Create viral content strategies from your phone. Perfect for creators on the go."
  imageSrc="/viral-blueprint-mobile.png"
  imageAlt="Viral Blueprint Mobile Experience"
  features={[
    "Generate blueprints in 60 seconds",
    "Copy scripts with one tap",
    "Access from anywhere"
  ]}
/>
```

---

## Styling Tips

### Match Viral Blueprint Theme

```jsx
<div className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-gradient-to-br from-white/60 to-gray-50/40 border border-white/60 shadow-elevated p-8">
  <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-transparent to-purple-50/20 pointer-events-none" />
  
  <div className="relative z-10">
    <IPhoneMockup 
      imageSrc="/viral-blueprint-mobile.png" 
      showBackground={false}
    />
  </div>
</div>
```

### Animated Entrance

```jsx
<div className="animate-slideUp" style={{ animationDelay: '200ms' }}>
  <IPhoneMockup imageSrc="/viral-blueprint-mobile.png" />
</div>
```

### With Glow Effect

```jsx
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-purple-600/20 blur-3xl rounded-full scale-150" />
  <div className="relative">
    <IPhoneMockup imageSrc="/viral-blueprint-mobile.png" />
  </div>
</div>
```

---

## Remember to:

1. ✅ Save your screenshot as `/public/viral-blueprint-mobile.png`
2. ✅ Import the component: `import IPhoneMockup from '../components/IPhoneMockup';`
3. ✅ Add the `Check` and `Sparkles` icons if using the full examples
4. ✅ Test on different screen sizes

---

**That's it!** Your Viral Blueprint page now showcases the beautiful mobile experience. 🎉


