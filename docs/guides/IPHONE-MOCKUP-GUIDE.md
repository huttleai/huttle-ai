# iPhone Mockup Component Guide

## Overview

The `IPhoneMockup` component allows you to display mobile screenshots inside a realistic iPhone frame with notch, status bar, home indicator, and physical buttons.

Perfect for:
- Marketing materials
- Documentation
- Presentations
- Portfolio showcases
- App demos

## Quick Start

### 1. Add Your Screenshot

Place your mobile screenshot in the `/public` folder:

```
/public/
  └── viral-blueprint-mobile.png  (your screenshot)
```

### 2. Import the Component

```jsx
import IPhoneMockup from '../components/IPhoneMockup';
```

### 3. Use It

```jsx
<IPhoneMockup 
  imageSrc="/viral-blueprint-mobile.png" 
  imageAlt="Viral Blueprint Generator mobile view"
/>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSrc` | string | *required* | Path to the image file (e.g., `/screenshot.png`) |
| `imageAlt` | string | `"Mobile screenshot"` | Alt text for accessibility |
| `size` | `"small"` \| `"medium"` \| `"large"` | `"medium"` | iPhone frame size variant |
| `showBackground` | boolean | `true` | Show gradient background container |

## Size Variants

### Small (iPhone SE)
- Width: 300px
- Height: 650px
- Best for: Compact displays, multiple mockups in a row

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png" 
  size="small"
/>
```

### Medium (iPhone 13/14)
- Width: 375px
- Height: 812px
- Best for: Standard presentations, most common use case

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png" 
  size="medium"
/>
```

### Large (iPhone 14 Pro Max)
- Width: 430px
- Height: 932px
- Best for: Hero sections, detailed showcases

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png" 
  size="large"
/>
```

## Usage Examples

### Basic Usage

```jsx
<IPhoneMockup 
  imageSrc="/viral-blueprint-mobile.png" 
  imageAlt="Viral Blueprint Generator"
/>
```

### Without Background

For transparent/custom backgrounds:

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png" 
  showBackground={false}
/>
```

### Multiple Mockups in a Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <IPhoneMockup 
    imageSrc="/screen1.png" 
    size="small"
  />
  <IPhoneMockup 
    imageSrc="/screen2.png" 
    size="small"
  />
  <IPhoneMockup 
    imageSrc="/screen3.png" 
    size="small"
  />
</div>
```

### In a Feature Section

```jsx
<section className="py-20 bg-gray-50">
  <div className="max-w-6xl mx-auto px-4">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 className="text-4xl font-bold mb-4">
          Beautiful Mobile Experience
        </h2>
        <p className="text-gray-600 text-lg">
          Our app looks stunning on any device.
        </p>
      </div>
      <IPhoneMockup 
        imageSrc="/app-screenshot.png" 
        imageAlt="Mobile app interface"
      />
    </div>
  </div>
</section>
```

## Demo Page

Visit the demo page to see all variants in action:

**URL:** `/dashboard/mockup-demo`

Or navigate to: `http://localhost:5173/dashboard/mockup-demo`

## Features

✅ Realistic iPhone frame with notch  
✅ Accurate status bar (time, signal, battery)  
✅ Home indicator  
✅ Physical buttons (power, volume)  
✅ Subtle glow effect  
✅ Responsive sizing  
✅ Customizable background  
✅ Accessibility-friendly  

## Tips for Best Results

### Screenshot Preparation

1. **Aspect Ratio:** Use screenshots with 19.5:9 aspect ratio (iPhone standard)
2. **Resolution:** Higher resolution = better quality (recommend 2x or 3x)
3. **Format:** PNG for best quality, JPEG for smaller file size
4. **Content:** Capture full screen including status bar area

### Recommended Screenshot Sizes

- **Small:** 600x1300px (2x)
- **Medium:** 750x1624px (2x) or 1125x2436px (3x)
- **Large:** 860x1864px (2x) or 1290x2796px (3x)

### Taking Screenshots

**On Real Device:**
- iPhone: Press Side Button + Volume Up simultaneously
- Screenshots automatically include status bar and home indicator

**In Browser DevTools:**
1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
3. Select iPhone 13/14 Pro
4. Take screenshot (Cmd+Shift+P → "Capture screenshot")

**In Figma/Design Tools:**
- Use iPhone 13/14 frame (375x812pt)
- Export at 2x or 3x resolution

## Styling Customization

The component uses Tailwind CSS. You can wrap it in a container to customize:

```jsx
<div className="bg-gradient-to-br from-blue-500 to-purple-600 p-12 rounded-3xl">
  <IPhoneMockup 
    imageSrc="/screenshot.png" 
    showBackground={false}
  />
</div>
```

## Troubleshooting

### Image Not Showing

**Problem:** Image doesn't appear in the frame

**Solutions:**
1. Verify the image exists in `/public` folder
2. Check the path starts with `/` (e.g., `/screenshot.png`)
3. Clear browser cache and refresh
4. Check browser console for 404 errors

### Image Looks Stretched

**Problem:** Screenshot appears distorted

**Solutions:**
1. Use images with 19.5:9 aspect ratio
2. Crop your screenshot to match iPhone dimensions
3. Use `object-cover` which is already applied (crops to fit)

### Mockup Too Large/Small

**Problem:** Frame doesn't fit your layout

**Solutions:**
1. Try different `size` prop: `"small"`, `"medium"`, or `"large"`
2. Wrap in a container with max-width
3. Use CSS transform scale if needed

## Advanced Usage

### Custom Wrapper

```jsx
function CustomMockup() {
  return (
    <div className="relative">
      {/* Your custom decorations */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
      
      <IPhoneMockup 
        imageSrc="/screenshot.png" 
        showBackground={false}
      />
      
      {/* Your custom badge */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-full shadow-xl">
        <span className="font-bold text-gray-900">New Feature!</span>
      </div>
    </div>
  );
}
```

### Animated Entrance

```jsx
<div className="animate-slideUp">
  <IPhoneMockup 
    imageSrc="/screenshot.png" 
  />
</div>
```

## Component Files

- **Component:** `src/components/IPhoneMockup.jsx`
- **Demo Page:** `src/components/IPhoneMockupDemo.jsx`
- **Route:** `/dashboard/mockup-demo`

## Support

For issues or questions:
1. Check this guide first
2. Review the demo page for examples
3. Inspect the component code for customization options

---

**Created:** January 2026  
**Version:** 1.0.0  
**Compatibility:** React 18+, Tailwind CSS 3+




