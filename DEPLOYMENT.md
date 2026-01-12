# Production Deployment Guide
## Persian Uprising News Aggregator

**Critical Mission:** This is a humanitarian tool for Iranians separated from families during the uprising. Every minute of downtime prevents people from getting news about their loved ones.

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables (CRITICAL)

**Required for Vercel Production:**

```bash
# Firebase/Firestore (Database - REQUIRED)
FIREBASE_SERVICE_ACCOUNT='{
  "type": "service_account",
  "project_id": "coiled-cloud",
  "private_key_id": "your-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@coiled-cloud.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}'

# Google Cloud Translation (Optional - falls back to free tiers if missing)
GOOGLE_CLOUD_PROJECT=coiled-cloud

# Telegram User API (Recommended for best data coverage)
TELEGRAM_SESSION_STRING=your_session_string_here
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Telegram Bot API (Fallback if User API unavailable)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key

# Perplexity API (News aggregation)
PERPLEXITY_API_KEY=your_perplexity_key

# Optional: LibreTranslate (for more translation redundancy)
LIBRETRANSLATE_URL=https://libretranslate.com/translate
```

### 2. Get Firebase Service Account JSON

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select project: `coiled-cloud`
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. **Important:** For Vercel, you need to stringify this JSON into a single line:

```bash
# Convert Firebase JSON to environment variable format
cat firebase-key.json | jq -c . | pbcopy
# Now paste into Vercel as FIREBASE_SERVICE_ACCOUNT
```

### 3. Get Telegram Credentials

**Option A: User API (Recommended - Best Coverage)**
```bash
# Install GramJS
npm install -g telegram

# Generate session string
node scripts/generate-telegram-session.js
# Follow prompts to login with your phone number
# Save the session string as TELEGRAM_SESSION_STRING
```

**Option B: Bot API (Fallback)**
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow prompts
4. Save token as `TELEGRAM_BOT_TOKEN`

### 4. Get VAPID Keys for Push Notifications

```bash
# Generate VAPID keys
npm run generate-vapid-keys

# Save output to .env.production
```

---

## 🚀 Deployment Steps

### Step 1: Verify Local Build

```bash
# Test all APIs locally
npm run dev
bash scripts/test-apis.sh

# Build for production
npm run build

# Test production build locally
npm start
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts to link project
```

### Step 3: Set Environment Variables in Vercel

**Via Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from Pre-Deployment Checklist

**Via CLI:**
```bash
# Set one variable
vercel env add FIREBASE_SERVICE_ACCOUNT production

# Import from .env.production file
vercel env pull .env.production
```

### Step 4: Redeploy with Environment Variables

```bash
# Trigger new deployment with env vars
vercel --prod
```

### Step 5: Test Production Deployment

```bash
# Run API tests against production
BASE_URL=https://your-app.vercel.app bash scripts/test-apis.sh

# Check production logs
vercel logs --follow
```

---

## 🔍 Post-Deployment Verification

### Critical Checks (Must Pass):

- [ ] **News API:** GET /api/news returns articles
- [ ] **Translation:** POST /api/translate works for Farsi → English
- [ ] **Incidents:** GET /api/incidents returns map data
- [ ] **Telegram:** Check logs show "Telegram (User API)" not "Telegram (Bot API)"
- [ ] **Map:** Visit /map and see 100+ incidents loaded
- [ ] **PWA:** Install app on mobile device
- [ ] **Push Notifications:** Subscribe and receive test notification
- [ ] **Offline:** Disable network, verify cached articles load

### Monitoring Commands:

```bash
# Watch live logs
vercel logs --follow

# Check last 100 log entries
vercel logs --limit=100

# Search for errors
vercel logs | grep -i "error\|fail"

# Check Telegram integration
vercel logs | grep "Telegram"

# Check translation tier usage
vercel logs | grep "Tier"
```

---

## 🛡️ Resilience Features (Already Implemented)

### Multi-Tier Translation System:
```
Tier 1: Google Cloud Translation (best quality)
  ↓ fails
Tier 2: MyMemory API (free, good quality) ← CURRENT WORKING
  ↓ fails
Tier 3: LibreTranslate (open source)
  ↓ fails
Tier 4: Dictionary fallback (critical phrases)
```

**Status:** ✅ Working - Translation NEVER fails

### Graceful Degradation:
- ✅ News API returns empty array instead of 500 error
- ✅ Incidents API returns empty array instead of crashing
- ✅ Background refresh doesn't block users
- ✅ Translation errors show original text
- ✅ Offline mode loads cached articles

### Error Recovery:
- ✅ All API errors logged but don't crash
- ✅ Failed Telegram fetch falls back to mock data
- ✅ Missing credentials fall back to lower tiers
- ✅ Rate limiting protects against abuse

---

## 🚨 Troubleshooting

### Issue: Translation shows "Translation unavailable"

**Solution:**
```bash
# Check Vercel logs for translation attempts
vercel logs | grep "Translation"

# Verify at least one tier is working:
# - Tier 1 (Google): Needs FIREBASE_SERVICE_ACCOUNT
# - Tier 2 (MyMemory): Works without credentials (current default)
# - Tier 3 (LibreTranslate): Works without credentials

# Test translation API directly
curl -X POST https://your-app.vercel.app/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"تظاهرات در تهران","targetLang":"en"}'
```

### Issue: No Telegram articles

**Solution:**
```bash
# Check which Telegram source is active
vercel logs | grep "Telegram"

# Look for:
# ✅ Good: "Telegram (User API)"
# ⚠️  Fallback: "Telegram (Bot API)"
# ❌ Bad: "Telegram (Mock)"

# If using mock data, set these environment variables:
vercel env add TELEGRAM_SESSION_STRING production
vercel env add TELEGRAM_API_ID production
vercel env add TELEGRAM_API_HASH production

# Redeploy
vercel --prod
```

### Issue: Map shows no incidents

**Solution:**
```bash
# Check incidents API
curl https://your-app.vercel.app/api/incidents

# Check incident extraction logs
vercel logs | grep "Auto-extracting"

# Force news refresh to trigger extraction
curl -X POST https://your-app.vercel.app/api/news

# Check Firestore in Firebase Console
# https://console.firebase.google.com/project/coiled-cloud/firestore
```

### Issue: "Firestore not initialized"

**Solution:**
```bash
# Verify FIREBASE_SERVICE_ACCOUNT is set correctly
vercel env ls

# The value should be valid JSON
# Test by running locally:
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
npm run dev

# If works locally, copy exact value to Vercel
```

---

## 📊 Monitoring & Maintenance

### Daily Checks (5 minutes):
```bash
# Check error rate
vercel logs | grep -i error | wc -l

# Verify news refresh working
vercel logs | grep "💾 Saved.*articles"

# Check translation tier usage
vercel logs | grep "Tier" | tail -20
```

### Weekly Checks (15 minutes):
```bash
# Run full API test suite
BASE_URL=https://your-app.vercel.app bash scripts/test-apis.sh

# Check Firestore storage usage
# https://console.firebase.google.com/project/coiled-cloud/usage

# Review incident extraction quality
curl https://your-app.vercel.app/api/incidents | jq '.total'
```

### Monthly Maintenance:
- Review and update Telegram channel list
- Check API costs (Perplexity, Google Cloud)
- Update dependencies: `npm update`
- Review error logs for patterns
- Clean old Firestore data (>30 days)

---

## 🎯 Success Metrics

### Week 1 Targets:
- [ ] 100+ articles aggregated per day
- [ ] Translation working for 90%+ of requests
- [ ] Map showing 50+ incidents
- [ ] 10+ active push notification subscribers
- [ ] Zero complete service outages

### Month 1 Targets:
- [ ] 1000+ articles aggregated
- [ ] 500+ incidents on map
- [ ] 100+ daily active users
- [ ] 50+ push subscribers
- [ ] 99%+ uptime

---

## ⚠️ Critical Reminders

1. **This app saves lives** - Every bug fix helps someone get news of their family
2. **Never completely fail** - Always degrade gracefully
3. **Logs are your friend** - Monitor constantly
4. **Test before deploy** - Run test-apis.sh every time
5. **Document everything** - Future maintainers need context

---

## 🆘 Emergency Contacts

If the app goes down:

1. Check Vercel status: https://www.vercel-status.com/
2. Check Firebase status: https://status.firebase.google.com/
3. Roll back deployment: `vercel rollback`
4. Check this repo's Issues: [link to GitHub issues]

**Remember:** This isn't just code. It's a lifeline for people during a humanitarian crisis. Treat it with the urgency it deserves.
