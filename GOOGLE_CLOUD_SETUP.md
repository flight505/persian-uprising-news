# Google Cloud Infrastructure - Available Resources

**Project:** coiled-cloud
**Account:** jesper_vang@me.com
**Region:** us-east1 (primary), us-central1 (AI)

---

## ✅ What You Already Have

### 1. **Google Cloud SDK** (gcloud CLI)
- **Version:** 546.0.0
- **Location:** /opt/homebrew/bin/gcloud
- **Authentication:** ✅ Active (jesper_vang@me.com)
- **Project:** coiled-cloud

### 2. **Enabled Services**

#### AI & Machine Learning:
- ✅ **Vertex AI API** - Gemini Pro access
- ✅ **Cloud Datastore API** - NoSQL database

#### Data Storage & Analytics:
- ✅ **BigQuery** - Data warehouse
- ✅ **Cloud Storage** - File storage (like S3)
- ✅ **Cloud Storage API** - File management

#### Compute:
- ✅ **Compute Engine** - VMs and serverless

#### Monitoring:
- ✅ **Cloud Logging** - Logs
- ✅ **Cloud Monitoring** - Metrics
- ✅ **Cloud Trace** - Performance tracing

### 3. **Existing Resources**

#### Cloud Storage Bucket:
- **Name:** protact-coiled-test-20251106134136
- **Location:** US-EAST1
- **URL:** gs://protact-coiled-test-20251106134136/
- **Created:** November 6, 2025

---

## 🔄 Google Cloud vs AWS Comparison

Since you have Google Cloud already set up and a Gemini Pro subscription, here's how Google services map to AWS:

| AWS Service | Google Cloud Equivalent | Status |
|-------------|-------------------------|--------|
| **DynamoDB** | **Firestore** | ⚠️ Not enabled (easy to enable) |
| S3 | Cloud Storage | ✅ Already have bucket |
| Lambda | Cloud Functions | ⚠️ Not enabled |
| CloudWatch | Cloud Logging/Monitoring | ✅ Enabled |
| API Gateway | Cloud Endpoints | ⚠️ Not enabled |
| Cognito | Firebase Auth | ⚠️ Not enabled |
| Claude API | Gemini Pro (Vertex AI) | ✅ Enabled + You have subscription! |

---

## 💡 Recommended Approach: Use Google Cloud Firestore

### Why Firestore Instead of DynamoDB?

**Advantages:**
1. ✅ **Already authenticated** - Your account is set up
2. ✅ **Gemini Pro integration** - You're paying for it, use it!
3. ✅ **No new credentials** - Use existing gcloud auth
4. ✅ **Native integration** - Works seamlessly with Vertex AI
5. ✅ **Free tier** - 1GB storage + 50k reads/day + 20k writes/day
6. ✅ **Real-time listeners** - Better than DynamoDB Streams
7. ✅ **Easier queries** - More flexible than DynamoDB

**Cost Comparison:**

| Service | Free Tier | Pricing After Free Tier |
|---------|-----------|------------------------|
| **Firestore** | 1GB storage<br>50k reads/day<br>20k writes/day | $0.18/GB storage<br>$0.06 per 100k reads<br>$0.18 per 100k writes |
| **DynamoDB** | 25GB storage<br>25 read units<br>25 write units | $0.25/GB storage<br>$0.25 per million reads<br>$1.25 per million writes |

**Verdict:** Firestore is **cheaper** and you're already set up!

---

## 🚀 Setup Guide: Enable Firestore

### Step 1: Enable Firestore API

```bash
# Enable Firestore
gcloud services enable firestore.googleapis.com --project=coiled-cloud

# Wait 2-3 minutes for propagation
```

### Step 2: Create Firestore Database

```bash
# Create Firestore database in Native mode
gcloud firestore databases create \
  --location=us-east1 \
  --type=firestore-native \
  --project=coiled-cloud
```

**Location Options:**
- `us-east1` (Virginia) - Closest to Vercel
- `us-central1` (Iowa) - Same region as Vertex AI
- `europe-west1` (Belgium) - For EU users

### Step 3: Set Up Collections

We'll create these collections:

1. **articles** - News articles
   - Document ID: auto-generated
   - Fields: title, content, source, publishedAt, tags, etc.

2. **incidents** - Crowdsourced reports
   - Document ID: auto-generated
   - Fields: type, title, location (GeoPoint), images, verified

3. **subscriptions** - Push notification subscribers
   - Document ID: endpoint hash
   - Fields: endpoint, keys, subscribedAt

### Step 4: Install Firebase Admin SDK

```bash
cd /Users/jesper/Projects/Dev_projects/Rise_up
npm install firebase-admin
```

### Step 5: Generate Service Account Key

```bash
# Create service account
gcloud iam service-accounts create rise-up-news \
  --display-name "Rise Up News Service Account" \
  --project=coiled-cloud

# Grant Firestore access
gcloud projects add-iam-policy-binding coiled-cloud \
  --member="serviceAccount:rise-up-news@coiled-cloud.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Generate key file
gcloud iam service-accounts keys create \
  ~/rise-up-firebase-key.json \
  --iam-account=rise-up-news@coiled-cloud.iam.gserviceaccount.com

# Key will be saved to: ~/rise-up-firebase-key.json
```

---

## 📝 Implementation Plan

### Phase 1: Firestore Setup (30 minutes)

1. **Enable Firestore API**
   ```bash
   gcloud services enable firestore.googleapis.com --project=coiled-cloud
   ```

2. **Create Database**
   ```bash
   gcloud firestore databases create \
     --location=us-east1 \
     --type=firestore-native \
     --project=coiled-cloud
   ```

3. **Install Firebase Admin**
   ```bash
   npm install firebase-admin
   ```

4. **Create Service Account Key**
   ```bash
   gcloud iam service-accounts create rise-up-news --project=coiled-cloud
   gcloud projects add-iam-policy-binding coiled-cloud \
     --member="serviceAccount:rise-up-news@coiled-cloud.iam.gserviceaccount.com" \
     --role="roles/datastore.user"
   gcloud iam service-accounts keys create \
     ~/rise-up-firebase-key.json \
     --iam-account=rise-up-news@coiled-cloud.iam.gserviceaccount.com
   ```

### Phase 2: Code Implementation (1-2 hours)

1. **Create Firestore Client** (`lib/firestore.ts`)
   - Initialize Firebase Admin
   - Create helper functions for CRUD operations
   - Add connection pooling

2. **Update API Endpoints**
   - Replace in-memory cache with Firestore queries
   - Update `/api/news` to read from Firestore
   - Update `/api/incidents` to write to Firestore
   - Update `/api/subscribe` to store in Firestore

3. **Add Environment Variables**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   GOOGLE_CLOUD_PROJECT=coiled-cloud
   ```

4. **Deploy to Vercel**
   - Upload service account key to Vercel
   - Set environment variables
   - Redeploy

### Phase 3: Migration (30 minutes)

1. **Test locally** with Firestore
2. **Verify data persistence** across deploys
3. **Test all features** (news feed, reports, map)
4. **Monitor performance** and costs

---

## 💰 Cost Estimate: Firestore

### Free Tier (Sufficient for MVP):
- **Storage:** 1 GB
- **Reads:** 50,000 per day
- **Writes:** 20,000 per day
- **Deletes:** 20,000 per day

### Expected Usage:

| Operation | Frequency | Daily Count | Within Free Tier? |
|-----------|-----------|-------------|-------------------|
| News scraping (write) | Every 10 min | 1,440 writes | ✅ Yes (14× under limit) |
| News feed (read) | 100 users × 10 views | 1,000 reads | ✅ Yes (50× under limit) |
| Incident reports (write) | 50 reports/day | 50 writes | ✅ Yes (400× under limit) |
| Map incidents (read) | 100 users × 5 views | 500 reads | ✅ Yes (100× under limit) |

**Total Monthly Cost:** $0 (well within free tier)

### Projected Cost at Scale (1000+ users):

- **Storage:** 5 GB × $0.18 = $0.90/month
- **Reads:** 1M reads/month × $0.06/100k = $0.60/month
- **Writes:** 100k writes/month × $0.18/100k = $0.18/month

**Total at Scale:** ~$1.68/month (vs $5-10 for DynamoDB)

---

## 🎯 Bonus: Use Gemini Pro for AI Features

Since you have Gemini Pro, you can replace Claude Haiku for:

### 1. **Content Moderation**
```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: 'coiled-cloud',
  location: 'us-central1',
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-pro',
});

const result = await model.generateContent(
  `Analyze this incident report for spam or inappropriate content: "${reportText}"`
);
```

**Cost:** $0.00025 per 1000 characters (cheaper than Claude Haiku!)

### 2. **News Summarization**
- Replace Perplexity API with Gemini Pro
- Use Gemini to summarize news articles
- Cost: ~$0.005 per article (vs $0.02 for Perplexity)

### 3. **Translation**
- Auto-translate Farsi to English
- Better context understanding than Google Translate
- Cost: Included in Gemini Pro subscription

---

## 📊 Total Cost Comparison

### Current Stack (AWS + External APIs):
| Service | Monthly Cost |
|---------|--------------|
| Perplexity API | $86.40 |
| Apify (Twitter) | $86.40 |
| AWS DynamoDB | $0 (free tier) |
| Cloudflare Images | $0 (free tier) |
| **TOTAL** | **$172.80/month** |

### Proposed Stack (Google Cloud):
| Service | Monthly Cost |
|---------|--------------|
| Gemini Pro (summarization) | Included in subscription |
| Gemini Pro (moderation) | $0.50 |
| Twitter (Apify) | $86.40 |
| Firestore | $0 (free tier) |
| Cloud Storage | $0 (free tier) |
| **TOTAL** | **$86.90/month** |

**Savings:** $85.90/month (50% reduction!)

---

## 🔐 Security Notes

### Service Account Key:
- ✅ Store in `~/rise-up-firebase-key.json` (not in repo)
- ✅ Add to `.gitignore`
- ✅ Upload to Vercel as environment variable
- ❌ NEVER commit to GitHub

### Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Articles: read by all, write by server only
    match /articles/{article} {
      allow read: if true;
      allow write: if false; // Only server can write
    }

    // Incidents: read by all, write by authenticated users
    match /incidents/{incident} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false; // Only admin can update
    }

    // Subscriptions: read/write by server only
    match /subscriptions/{subscription} {
      allow read, write: if false; // Server-side only
    }
  }
}
```

---

## 🛠️ Useful Commands

### Check Firestore Status:
```bash
gcloud firestore databases list --project=coiled-cloud
```

### View Collections:
```bash
gcloud firestore indexes composite list --project=coiled-cloud
```

### Import Data:
```bash
gcloud firestore import gs://your-bucket/export-folder --project=coiled-cloud
```

### Export Data:
```bash
gcloud firestore export gs://protact-coiled-test-20251106134136/backups --project=coiled-cloud
```

### Monitor Usage:
```bash
gcloud monitoring dashboards list --project=coiled-cloud
```

### Check Costs:
```bash
# View current billing
gcloud billing accounts list
gcloud billing projects describe coiled-cloud
```

---

## 📚 Resources

- **Firestore Docs:** https://cloud.google.com/firestore/docs
- **Firebase Admin SDK:** https://firebase.google.com/docs/admin/setup
- **Vertex AI (Gemini):** https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini
- **Cloud Storage:** https://cloud.google.com/storage/docs
- **Pricing Calculator:** https://cloud.google.com/products/calculator

---

## ✅ Quick Start Checklist

Ready to switch from AWS to Google Cloud? Follow these steps:

- [ ] Enable Firestore API
- [ ] Create Firestore database in us-east1
- [ ] Create service account and generate key
- [ ] Install firebase-admin in project
- [ ] Create `lib/firestore.ts` client
- [ ] Update API endpoints to use Firestore
- [ ] Upload service account key to Vercel
- [ ] Test locally
- [ ] Deploy to production
- [ ] Verify data persistence
- [ ] (Bonus) Replace Perplexity with Gemini Pro

**Estimated Time:** 2-3 hours
**Expected Savings:** $86/month
**Difficulty:** Easy (you're already authenticated!)

---

**Recommendation:** Use Google Cloud Firestore instead of AWS DynamoDB. You'll save money, simplify your stack, and leverage your existing Gemini Pro subscription!

Ready to proceed? Let me know and I'll help you set it up! 🚀
