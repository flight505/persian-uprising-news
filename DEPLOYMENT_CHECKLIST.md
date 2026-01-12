# 🚀 Deployment Checklist for Persian Uprising News

## ✅ Pre-Deployment (Completed)
- [x] All 4 agents completed successfully
- [x] Build passes locally (`npm run build`)
- [x] Code committed and pushed to GitHub
- [x] 43 files changed, 8,540+ lines added

## 🔧 Vercel Environment Variables to Add

### **Required (App Won't Work Without These):**
```bash
# Google Cloud (for Translation + Firestore)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=[Upload: service-account-key.json as file]

# Telegram User API (for news fetching)
TELEGRAM_API_ID=your-api-id
TELEGRAM_API_HASH=your-api-hash
TELEGRAM_SESSION_STRING="your-session-string"

# Perplexity API (for news aggregation)
PERPLEXITY_API_KEY=your-perplexity-key

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
```

**Note:** Copy values from your local `.env` file. All these credentials are already set in Vercel from previous deployments.

### **Optional (Improves Performance):**
```bash
# Upstash Redis (for caching - get from console.upstash.com)
UPSTASH_REDIS_REST_URL=[Your REST URL]
UPSTASH_REDIS_REST_TOKEN=[Your REST Token]

# Algolia Search (for faster search - get from algolia.com)
NEXT_PUBLIC_ALGOLIA_APP_ID=[Your App ID]
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=[Your Search-Only API Key]
ALGOLIA_ADMIN_KEY=[Your Admin API Key]

# Admin Secret (for search re-indexing)
ADMIN_SECRET=[Generate random string]
```

### **Not Needed (Disabled):**
```bash
# Twitter/Apify (disabled to save costs)
# APIFY_API_TOKEN=...

# Telegram Bot API (replaced by User API)
# TELEGRAM_BOT_TOKEN=...
```

## 📝 Deployment Steps

### 1. Add Environment Variables to Vercel
```bash
# Go to: https://vercel.com/jespers-projects-dbff6d83/persian-uprising-news/settings/environment-variables

# Add each variable above
# For GOOGLE_APPLICATION_CREDENTIALS: Upload the JSON file directly
```

### 2. Deploy to Production
```bash
vercel --prod
```

### 3. Post-Deployment Testing
- [ ] Visit production URL
- [ ] Test translation on Farsi articles (click "Translate to English")
- [ ] Try search with ⌘K (should work with Fuse.js, no Algolia needed)
- [ ] Check map for auto-extracted incidents (should have 12+ from Telegram)
- [ ] Verify UI looks modern with glassmorphism effects
- [ ] Test on mobile device
- [ ] Check Lighthouse score (should be 90+)

### 4. Monitor Performance
```bash
# Check Vercel logs for any errors
vercel logs

# Monitor Google Cloud Translation API usage:
# https://console.cloud.google.com/apis/api/translate.googleapis.com

# Check Firestore usage:
# https://console.firebase.google.com/project/coiled-cloud/firestore
```

## 🎯 Expected Results

**Performance:**
- First Contentful Paint: <1.5s
- Time to Interactive: <2s
- Lighthouse Score: 90+

**Features:**
- ✅ Modern Material 3 UI
- ✅ One-click Farsi translation
- ✅ Auto-extracted incidents from Telegram
- ✅ Full-text search (⌘K)
- ✅ Timeline slider on map
- ✅ Heatmap layer

**Cost:**
- Still $3.60/month (unchanged)
- All new features within free tiers

## 🐛 Troubleshooting

**Translation Not Working:**
- Check GOOGLE_CLOUD_PROJECT is set
- Verify GOOGLE_APPLICATION_CREDENTIALS file uploaded
- Check API is enabled: https://console.cloud.google.com/apis/library/translate.googleapis.com

**Incidents Not Auto-Extracting:**
- Check production logs for extraction errors
- Verify Telegram articles are being fetched
- Check Firestore has write permissions

**Search Not Working:**
- Fuse.js search works without any setup
- If using Algolia, verify credentials are correct
- Check browser console for errors

**UI Looks Wrong:**
- Clear browser cache
- Check Geist Sans font loads correctly
- Verify Tailwind CSS builds properly

## 📊 Success Metrics

**Week 1:**
- [ ] 100+ daily active users
- [ ] 500+ articles aggregated
- [ ] 50+ auto-extracted incidents
- [ ] 1000+ search queries
- [ ] 200+ translations

**Week 4:**
- [ ] 500+ daily active users
- [ ] 5000+ articles aggregated
- [ ] 200+ verified incidents
- [ ] Cost still under $10/month

