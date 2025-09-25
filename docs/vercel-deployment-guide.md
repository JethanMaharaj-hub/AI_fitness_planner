# Vercel Deployment Guide: AI Fitness Planner PWA

## 🚀 Ready for Deployment!

Your AI Fitness Planner is now configured for Vercel deployment with full PWA functionality.

## Pre-Deployment Checklist

### ✅ Files Added/Updated:
- [x] `vercel.json` - Vercel configuration with PWA headers
- [x] `deploy.sh` - Automated deployment script  
- [x] `.env.example` - Environment variables template
- [x] Updated `package.json` with deploy script
- [x] PWA manifest updated for production
- [x] Service worker configured
- [x] Build tested successfully

### 🔑 Required Before Deployment:

1. **Environment Variables** (Set in Vercel Dashboard):
   ```
   VITE_GEMINI_API_KEY=your_key_here
   VITE_YOUTUBE_API_KEY=your_key_here (optional)
   VITE_SUPABASE_URL=your_url (optional)
   VITE_SUPABASE_ANON_KEY=your_key (optional)
   ```

2. **PWA Icons** (Replace placeholders):
   - Add `icon-192.png` (192x192 pixels)
   - Add `icon-512.png` (512x512 pixels)
   - Add `favicon.ico` (32x32 pixels)

## Deployment Methods

### Method 1: Automated Script (Recommended)
```bash
./deploy.sh
```

### Method 2: Manual Deployment
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Build project
npm run build

# Deploy
vercel --prod
```

### Method 3: GitHub Integration
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Auto-deploy on every push

## Environment Variables Setup

### In Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable from `.env.example`
3. Set environment to "Production"
4. Redeploy after adding variables

### Required Variables:
- `VITE_GEMINI_API_KEY` - **Essential** for AI workout generation
- `VITE_YOUTUBE_API_KEY` - Improves YouTube video analysis
- `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` - Enables user auth

## Post-Deployment Testing

### PWA Feature Testing:
1. **Visit your Vercel URL** on mobile
2. **Look for install prompt** (should appear automatically)
3. **Install to home screen** (iOS: Share → Add to Home Screen)
4. **Test offline mode** (turn off WiFi, app should still work)
5. **Test timers** (screen should stay on during workouts)
6. **Test background recovery** (switch apps, return, timer continues)

### Performance Testing:
1. **Lighthouse audit** in Chrome DevTools
2. **PWA score should be 100**
3. **Performance score should be 90+**
4. **Load time should be <3 seconds**

## Expected Vercel URL Structure

Your app will be available at:
```
https://your-project-name.vercel.app
```

Or custom domain:
```
https://your-custom-domain.com
```

## PWA Features on HTTPS (Vercel)

✅ **What Works on Vercel HTTPS:**
- Service Worker registration
- App installation prompts
- Wake Lock API (screen stays on)
- Push notifications
- Background sync
- Offline functionality
- Cache API

❌ **What Doesn't Work on localhost:**
- Install prompts (browser restrictions)
- Some mobile PWA features
- Push notifications

## Troubleshooting

### Common Issues:

**1. Service Worker Not Loading:**
- Check `/sw.js` is accessible
- Verify HTTPS deployment
- Clear browser cache

**2. Install Prompt Not Appearing:**
- PWA criteria must be met
- HTTPS required
- Service worker must be active
- Manifest must be valid

**3. Environment Variables Not Working:**
- Redeploy after adding variables
- Check variable names (must start with VITE_)
- Verify values are correct

**4. Icons Not Loading:**
- Ensure icons are in `/public` folder
- Check file sizes and formats
- Verify manifest.json paths

## Performance Optimization

### Automatic Optimizations (Vercel):
- Gzip compression
- Image optimization
- CDN distribution
- HTTP/2 support

### Manual Optimizations:
- Code splitting (consider for large bundle)
- Image lazy loading
- Service worker caching strategy

## Monitoring & Analytics

### Built-in Vercel Analytics:
- Page views and performance
- Geographic distribution
- Device and browser stats

### Optional Integrations:
- Google Analytics
- Sentry error tracking
- Custom analytics events

## Security Headers

The `vercel.json` includes:
- Service Worker security headers
- Cache control policies
- Content type headers
- CORS configuration

## Next Steps After Deployment

1. **Test thoroughly** on multiple devices
2. **Share with beta users** for feedback
3. **Monitor performance** in Vercel dashboard
4. **Iterate based on usage** patterns
5. **Consider React Native migration** for Apple Watch

## Support

### Vercel Support:
- [Vercel Documentation](https://vercel.com/docs)
- [PWA Guide](https://vercel.com/guides/deploying-pwa)
- Community Discord

### PWA Resources:
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

**🎉 Your PWA is ready for the world!**

Run `./deploy.sh` when you're ready to go live!

*Last Updated: [Current Date]*