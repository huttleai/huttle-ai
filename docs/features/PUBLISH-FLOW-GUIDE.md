# Publish Flow Guide

## Overview

The new Publish Flow allows users to seamlessly publish content directly from Huttle AI to their social media platforms using deep links, with automatic fallbacks for desktop and unsupported browsers.

## How It Works

### 1. Deep Link Publishing

When a user clicks "Publish Now" on any post in Smart Calendar:

1. **Platform Selection** - User chooses target platform (Instagram, Facebook, TikTok, YouTube, or X)
2. **Preview** - Shows post caption and hashtags
3. **Deep Link Generation** - Creates platform-specific deep link
4. **Launch** - Opens native app (mobile) or web version (desktop)
5. **Tracking** - Logs publish attempt to `user_publishes` table

### 2. Platform Deep Links

#### Instagram
- **Deep Link**: `instagram://library?AssetPath={url}&text={caption}`
- **Fallback**: `https://www.instagram.com/create/story/`
- **Behavior**: Opens Instagram app to upload with pre-filled caption

#### Facebook
- **Deep Link**: `fb://compose?text={caption}&url={url}`
- **Fallback**: `https://www.facebook.com/dialog/share`
- **Behavior**: Opens composer with caption and media URL

#### TikTok
- **Deep Link**: `snssdk1233://upload?video={url}&text={caption}`
- **Fallback**: `https://www.tiktok.com/upload`
- **Behavior**: Opens TikTok upload screen with video and caption

#### YouTube
- **Deep Link**: `youtube://upload?video={url}&title={title}&description={caption}`
- **Fallback**: `https://studio.youtube.com/upload`
- **Behavior**: Opens YouTube Studio with video and metadata

#### X (Twitter)
- **Deep Link**: `twitter://post?message={caption}`
- **Fallback**: `https://twitter.com/intent/tweet`
- **Behavior**: Opens compose tweet with pre-filled text

### 3. Fallback Mechanisms

If deep link fails:
1. **Desktop**: Automatically copies caption to clipboard and opens web version
2. **Mobile**: Attempts deep link first, then web fallback after 1 second
3. **Last Resort**: Copies content to clipboard with toast notification

### 4. Mobile Detection

Uses `navigator.userAgent` to detect:
- iPhone/iPad/iPod
- Android devices

Adjusts behavior accordingly.

## Usage

### From Smart Calendar

```jsx
// In day view, click "Publish Now" button
<button onClick={() => handleOpenPublishModal(post)}>
  Publish Now
</button>

// PublishModal handles platform selection and deep linking
<PublishModal
  isOpen={isPublishModalOpen}
  onClose={() => setIsPublishModalOpen(false)}
  post={postToPublish}
/>
```

### Database Tracking

```sql
-- user_publishes table tracks publish actions
INSERT INTO user_publishes (user_id, post_id, platform, deep_link_used)
VALUES (user_id, post_id, 'instagram', true);
```

## Best Practices

### For Mobile Users

1. **Pre-upload media** to Supabase Storage for consistent URLs
2. **Keep captions under platform limits** (automatically handled)
3. **Test deep links** on both iOS and Android
4. **Handle permissions** - request clipboard and media access

### For Desktop Users

1. **Clipboard fallback** - Caption is automatically copied
2. **Web version opens** - User manually uploads media
3. **Toast notifications** guide the process

### Error Handling

```javascript
try {
  // Try deep link
  window.open(deepLink, '_blank');
} catch (error) {
  // Fallback to clipboard
  await navigator.clipboard.writeText(caption);
  addToast('Caption copied! Paste in your app', 'info');
}
```

## Supported Platforms

| Platform | Mobile Deep Link | Desktop Fallback | Clipboard |
|----------|-----------------|------------------|-----------|
| Instagram | ✅ | ✅ Web | ✅ |
| Facebook | ✅ | ✅ Web | ✅ |
| TikTok | ✅ | ✅ Web | ✅ |
| YouTube | ✅ | ✅ Studio | ✅ |
| X (Twitter) | ✅ | ✅ Web | ✅ |

## Future Enhancements

1. **Post-Publish Nudge** - n8n webhook triggers "Remix for another platform?" notification
2. **Success Tracking** - Confirm when user actually published (via n8n check)
3. **Media Upload** - Direct upload to platform APIs (requires OAuth)
4. **Scheduling** - Platform-native scheduling integration

## Testing

### iOS Testing
1. Open Safari on iPhone
2. Navigate to Smart Calendar
3. Click "Publish Now" → Instagram
4. Should open Instagram app with pre-filled caption

### Android Testing
1. Open Chrome on Android device
2. Navigate to Smart Calendar  
3. Click "Publish Now" → TikTok
4. Should open TikTok app with video upload

### Desktop Testing
1. Open Chrome/Firefox/Safari on desktop
2. Navigate to Smart Calendar
3. Click "Publish Now" → X
4. Should copy caption and open twitter.com/intent/tweet

## Troubleshooting

### Deep Link Doesn't Work
- **Cause**: App not installed or browser blocking
- **Solution**: Fallback to web version automatically

### Clipboard Fails
- **Cause**: Browser doesn't support clipboard API (old browsers)
- **Solution**: Show manual copy instructions

### Media URL Invalid
- **Cause**: Supabase signed URL expired
- **Solution**: Regenerate signed URL before publishing

## Security

- All Supabase signed URLs are temporary
- User publishes tracked for analytics only
- No OAuth tokens stored (manual upload only)
- RLS policies ensure users only see their own publish history

