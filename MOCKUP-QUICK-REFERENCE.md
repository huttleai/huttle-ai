# iPhone Mockup - Quick Reference Card

## 🚀 2-Minute Setup

### 1. Add Screenshot
```bash
# Save your screenshot here:
/public/viral-blueprint-mobile.png
```

### 2. Import Component
```jsx
import IPhoneMockup from '../components/IPhoneMockup';
```

### 3. Use It
```jsx
<IPhoneMockup 
  imageSrc="/viral-blueprint-mobile.png" 
  imageAlt="Viral Blueprint Generator"
/>
```

**Done!** ✅

---

## 📋 Props Cheat Sheet

```jsx
<IPhoneMockup 
  imageSrc="/screenshot.png"        // Required: Path to image
  imageAlt="Description"            // Optional: Alt text
  size="medium"                     // Optional: "small" | "medium" | "large"
  showBackground={true}             // Optional: true | false
/>
```

---

## 🎯 Common Use Cases

### Default (Medium with Background)
```jsx
<IPhoneMockup imageSrc="/screenshot.png" />
```

### Small Size
```jsx
<IPhoneMockup imageSrc="/screenshot.png" size="small" />
```

### Large Size
```jsx
<IPhoneMockup imageSrc="/screenshot.png" size="large" />
```

### No Background
```jsx
<IPhoneMockup imageSrc="/screenshot.png" showBackground={false} />
```

### Three in a Row
```jsx
<div className="grid md:grid-cols-3 gap-8">
  <IPhoneMockup imageSrc="/screen1.png" size="small" />
  <IPhoneMockup imageSrc="/screen2.png" size="small" />
  <IPhoneMockup imageSrc="/screen3.png" size="small" />
</div>
```

---

## 🔗 Quick Links

### Demo Pages
- **Full Demo:** `/dashboard/mockup-demo`
- **Showcase:** `/dashboard/mockup-showcase`

### Documentation
- **Quick Setup:** `IPHONE-MOCKUP-SETUP.md`
- **Full Guide:** `docs/guides/IPHONE-MOCKUP-GUIDE.md`
- **Integration:** `VIRAL-BLUEPRINT-MOCKUP-INTEGRATION.md`
- **Summary:** `MOCKUP-COMPLETE-SUMMARY.md`

---

## 📐 Sizes

| Size | Width | Height | Use Case |
|------|-------|--------|----------|
| `small` | 300px | 650px | Grids, multiple mockups |
| `medium` | 375px | 812px | Standard, most common |
| `large` | 430px | 932px | Hero sections, showcases |

---

## 🎨 Quick Styling

### Custom Background
```jsx
<div className="bg-gradient-to-br from-blue-500 to-purple-600 p-12 rounded-3xl">
  <IPhoneMockup imageSrc="/screenshot.png" showBackground={false} />
</div>
```

### With Animation
```jsx
<div className="animate-slideUp">
  <IPhoneMockup imageSrc="/screenshot.png" />
</div>
```

### Side by Side
```jsx
<div className="grid md:grid-cols-2 gap-8 items-center">
  <div>
    <h2 className="text-3xl font-bold mb-4">Mobile First</h2>
    <p>Beautiful on every device</p>
  </div>
  <IPhoneMockup imageSrc="/screenshot.png" />
</div>
```

---

## 🐛 Quick Fixes

**Image not showing?**
- Check: `/public/viral-blueprint-mobile.png` exists
- Path must start with `/`

**Too large?**
- Use `size="small"`

**Need custom background?**
- Use `showBackground={false}`

---

## 📸 Screenshot Tips

**Best dimensions:**
- Small: 600x1300px
- Medium: 750x1624px
- Large: 860x1864px

**Taking screenshots:**
- iPhone: Side Button + Volume Up
- Browser: DevTools → iPhone 13 Pro → Screenshot

---

## ✅ Checklist

- [ ] Screenshot saved to `/public/`
- [ ] Component imported
- [ ] Props configured
- [ ] Tested in browser
- [ ] Looks good on mobile

---

**Need more help?** See `MOCKUP-COMPLETE-SUMMARY.md`


