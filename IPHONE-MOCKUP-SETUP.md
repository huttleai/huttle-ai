# iPhone Mockup - Quick Setup Guide

## ✅ What's Been Created

I've created a complete iPhone mockup system for displaying your mobile screenshots in beautiful iPhone frames!

### Files Created:

1. **`src/components/IPhoneMockup.jsx`** - Main reusable component
2. **`src/components/IPhoneMockupDemo.jsx`** - Full demo page with examples
3. **`src/pages/MockupShowcase.jsx`** - Beautiful showcase page
4. **`docs/guides/IPHONE-MOCKUP-GUIDE.md`** - Complete documentation

### Routes Added:

- `/dashboard/mockup-demo` - Interactive demo with all variants
- `/dashboard/mockup-showcase` - Beautiful showcase page

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Your Screenshot

Save your mobile screenshot to the `public` folder:

```bash
# Place your screenshot here:
/public/viral-blueprint-mobile.png
```

**Note:** The screenshot from your message needs to be saved as `viral-blueprint-mobile.png` in the `/public` folder.

### Step 2: View the Demo

Start your dev server and visit:

```
http://localhost:5173/dashboard/mockup-demo
```

This shows all size variants and usage examples.

### Step 3: View the Showcase

For a beautiful presentation view:

```
http://localhost:5173/dashboard/mockup-showcase
```

---

## 📱 Usage Examples

### Basic Usage

```jsx
import IPhoneMockup from '../components/IPhoneMockup';

<IPhoneMockup 
  imageSrc="/viral-blueprint-mobile.png" 
  imageAlt="Viral Blueprint Generator"
/>
```

### Different Sizes

```jsx
// Small (iPhone SE)
<IPhoneMockup imageSrc="/screenshot.png" size="small" />

// Medium (iPhone 13/14) - Default
<IPhoneMockup imageSrc="/screenshot.png" size="medium" />

// Large (iPhone 14 Pro Max)
<IPhoneMockup imageSrc="/screenshot.png" size="large" />
```

### Without Background

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png" 
  showBackground={false}
/>
```

### In Your Viral Blueprint Page

Add this anywhere in `src/pages/ViralBlueprint.jsx`:

```jsx
import IPhoneMockup from '../components/IPhoneMockup';

// Then in your JSX:
<div className="my-12">
  <h2 className="text-2xl font-bold text-center mb-8">
    Mobile Experience
  </h2>
  <IPhoneMockup 
    imageSrc="/viral-blueprint-mobile.png" 
    imageAlt="Viral Blueprint Generator - Mobile View"
  />
</div>
```

---

## 🎨 Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSrc` | string | *required* | Path to image (e.g., `/screenshot.png`) |
| `imageAlt` | string | `"Mobile screenshot"` | Alt text for accessibility |
| `size` | `"small"` \| `"medium"` \| `"large"` | `"medium"` | iPhone frame size |
| `showBackground` | boolean | `true` | Show gradient background |

---

## 🎯 Features

✅ **Realistic iPhone Frame** - Notch, status bar, home indicator  
✅ **Multiple Sizes** - Small, Medium, Large variants  
✅ **Physical Buttons** - Power and volume buttons  
✅ **Status Bar** - Time, signal, WiFi, battery indicators  
✅ **Responsive** - Works on all screen sizes  
✅ **Customizable** - Background on/off, different sizes  
✅ **Accessible** - Proper alt text support  
✅ **Beautiful** - Subtle glow effects and shadows  

---

## 📸 Taking Screenshots

### On Real iPhone:
- Press **Side Button + Volume Up** simultaneously
- Screenshot saves to Photos app

### In Browser DevTools:
1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select "iPhone 13 Pro" or "iPhone 14"
4. Take screenshot: Cmd+Shift+P → "Capture screenshot"

### Recommended Dimensions:
- **Small:** 600x1300px
- **Medium:** 750x1624px or 1125x2436px
- **Large:** 860x1864px or 1290x2796px

---

## 🎨 Styling Examples

### Custom Background

```jsx
<div className="bg-gradient-to-br from-purple-600 to-blue-500 p-12 rounded-3xl">
  <IPhoneMockup 
    imageSrc="/screenshot.png" 
    showBackground={false}
  />
</div>
```

### Side-by-Side Comparison

```jsx
<div className="grid md:grid-cols-2 gap-8">
  <div>
    <h3 className="text-center font-bold mb-4">Before</h3>
    <IPhoneMockup imageSrc="/before.png" size="small" />
  </div>
  <div>
    <h3 className="text-center font-bold mb-4">After</h3>
    <IPhoneMockup imageSrc="/after.png" size="small" />
  </div>
</div>
```

### With Caption

```jsx
<div className="text-center">
  <IPhoneMockup imageSrc="/screenshot.png" />
  <p className="mt-6 text-gray-600 text-lg">
    Beautiful mobile experience on any device
  </p>
</div>
```

---

## 🔧 Troubleshooting

### Image Not Showing?

1. ✅ Check image is in `/public` folder
2. ✅ Path starts with `/` (e.g., `/screenshot.png`)
3. ✅ Clear browser cache and refresh
4. ✅ Check browser console for errors

### Image Looks Stretched?

1. ✅ Use 19.5:9 aspect ratio (iPhone standard)
2. ✅ Component uses `object-cover` (auto-crops)
3. ✅ Try different `size` prop

### Mockup Too Large?

1. ✅ Try `size="small"`
2. ✅ Wrap in container with `max-width`
3. ✅ Use CSS transform scale if needed

---

## 📚 Documentation

Full documentation available at:
**`docs/guides/IPHONE-MOCKUP-GUIDE.md`**

---

## 🎉 Next Steps

1. **Save your screenshot** to `/public/viral-blueprint-mobile.png`
2. **Visit the demo** at `/dashboard/mockup-demo`
3. **View the showcase** at `/dashboard/mockup-showcase`
4. **Use in your pages** - Import and add `<IPhoneMockup />` anywhere!

---

## 💡 Pro Tips

- Use high-resolution screenshots (2x or 3x)
- PNG format for best quality
- Capture full screen including status bar
- Use `showBackground={false}` for custom backgrounds
- Multiple mockups? Use `size="small"` in a grid

---

**Need Help?** Check the full guide at `docs/guides/IPHONE-MOCKUP-GUIDE.md`

**Created:** January 2026  
**Ready to use!** 🚀





