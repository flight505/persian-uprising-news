# Telegram Bot Channel Setup Guide

## ⚠️ Important Limitation

**Telegram bots CANNOT read public channel posts unless they are admins.**

Official news channels (BBC Persian, Manoto, etc.) will NOT grant admin access to random bots. You need to create your own channel and forward posts to it.

---

## ✅ Solution: Create Your Own Forwarding Channel

### Step 1: Create a Telegram Channel

1. Open Telegram app
2. Menu → **New Channel**
3. Channel Details:
   - **Name**: "Persian Uprising News Feed"
   - **Description**: "Aggregated news from BBC Persian, Manoto, Iran Intl, and other sources"
   - **Type**: Public
   - **Username**: `@PersianUprisingFeed` (or any available name)

4. Click **Create**

### Step 2: Add Bot as Admin

1. In your new channel, click channel name → **Administrators**
2. Click **Add Administrator**
3. Search for: `@persianUprising_bot`
4. Grant these permissions:
   - ✅ **Post Messages**
   - ✅ **Edit Messages**
   - ❌ **Delete Messages** (optional)
   - ❌ **Restrict Users** (not needed)
   - ❌ **Ban Users** (not needed)
   - ❌ **Invite Users** (not needed)
   - ❌ **Pin Messages** (not needed)
   - ❌ **Add Administrators** (not needed)

5. Click **Done**

### Step 3: Update Code with Your Channel

Edit `/lib/telegram-scraper.ts`:

```typescript
const MONITORED_CHANNELS = [
  '@PersianUprisingFeed',  // YOUR channel (replace with your actual username)
  // Remove these - bot can't read them:
  // '@BBCPersian',
  // '@manoto_tv',
  // '@IranIntlTV',
  // '@RadioFarda',
  // '@VOAFarsi',
];
```

### Step 4: Forward Posts to Your Channel

**Manual Forwarding:**
1. Subscribe to source channels (BBC Persian, Manoto, etc.)
2. When you see relevant news:
   - Long press the message
   - Click **Forward**
   - Select your channel: `@PersianUprisingFeed`
   - Click **Send**

**Semi-Automated:**
- Use Telegram Desktop app
- Set up auto-forward rules (requires Telegram Premium)

---

## 🧪 Test the Setup

### 1. Test Bot in Your Channel

```bash
# Send a test message from your bot to your channel
curl -X POST "https://api.telegram.org/bot8341612870:AAFuvarFaYL6BHyF45cYmEH7ywpeZEtTG8A/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "@PersianUprisingFeed",
    "text": "Test: Breaking news from Tehran. Students protesting at university. #MahsaAmini #IranProtests"
  }'
```

If successful, you'll see the message in your channel.

### 2. Check Bot Can Read Messages

```bash
# Test the scraper
curl https://persian-uprising-news.vercel.app/api/telegram/test
```

Expected response:
```json
{
  "success": true,
  "bot": {
    "id": 8341612870,
    "username": "persianUprising_bot"
  },
  "articlesFound": 1,
  "articles": [...]
}
```

### 3. Trigger Manual Scrape

```bash
curl -X POST https://persian-uprising-news.vercel.app/api/news
```

The test message should appear in your news feed!

---

## 🔄 Alternative: Use Direct Messages Instead

Instead of channels, you can have users send news directly to the bot:

### How It Works:

1. Users find breaking news
2. They message `@persianUprising_bot` with:
   ```
   Breaking: Large protests in Tehran at Azadi Square.
   Security forces using tear gas. #IranProtests #Tehran
   ```

3. Bot receives message via `getUpdates`
4. Filters for keywords
5. Publishes to news feed

### Advantages:
- ✅ No channel setup needed
- ✅ Crowdsourced news gathering
- ✅ Anyone can contribute
- ✅ Works immediately

### Disadvantages:
- ❌ Requires active community
- ❌ Manual moderation needed
- ❌ Less reliable than official sources

---

## 📊 Recommended Approach

**Hybrid Strategy:**

1. **Create your own channel** for forwarded posts from trusted sources
2. **Enable direct messages** for crowdsourced reports
3. **Use both** - channel for verified news, DMs for breaking reports

Update `MONITORED_CHANNELS`:
```typescript
const MONITORED_CHANNELS = [
  '@PersianUprisingFeed',  // Your forwarding channel
  // Bot will also receive direct messages automatically
];
```

---

## 🚀 Deploy Changes

After updating the channel list:

```bash
git add lib/telegram-scraper.ts
git commit -m "feat: update Telegram channels to use forwarding channel"
git push origin main
```

Vercel will automatically redeploy.

---

## 💡 Pro Tips

1. **Subscribe to Multiple Sources**: Follow BBC Persian, Manoto, Iran Intl, Radio Farda
2. **Forward Regularly**: Check sources 2-3 times per day
3. **Use Hashtags**: Add `#IranProtests #MahsaAmini` when forwarding
4. **Include Images**: Forward posts with photos/videos
5. **Verify Before Forwarding**: Only forward from credible sources

---

## 📞 Support

If you need help:
- Telegram Bot API Docs: https://core.telegram.org/bots/api
- Test your bot: https://t.me/persianUprising_bot
- Check logs: `vercel logs --since 1h`

---

**Last Updated**: January 12, 2026
