# Telegram Channels for Iran Protest Coverage

## Verified News Channels

These are legitimate, well-known news sources covering Iran:

### 1. **BBC Persian** (`@bbcpersian`)
- **URL Format**: `https://t.me/bbcpersian/{post_id}`
- **Coverage**: Comprehensive Iran news, protests, political developments
- **Language**: Farsi/English
- **Status**: Active, verified source

### 2. **Iran International** (`@IranIntl`)
- **URL Format**: `https://t.me/IranIntl/{post_id}`
- **Coverage**: Breaking news, protests, political analysis
- **Language**: Farsi/English
- **Status**: Active, major news outlet

### 3. **VOA Persian** (`@VOA_Persian`)
- **URL Format**: `https://t.me/VOA_Persian/{post_id}`
- **Coverage**: Voice of America Persian service, protests, human rights
- **Language**: Farsi/English
- **Status**: Active, U.S. government-funded

### 4. **Manoto TV** (`@manoto_tv`)
- **URL Format**: `https://t.me/manoto_tv/{post_id}`
- **Coverage**: Entertainment and news, protest coverage
- **Language**: Farsi
- **Status**: Active, popular Persian-language network

## How to Find and Add Real Post URLs

### Step 1: Visit the Channel on Telegram

1. Open Telegram (web, desktop, or mobile)
2. Visit the channel (e.g., `https://t.me/bbcpersian`)
3. Browse recent posts related to protests/incidents

### Step 2: Get the Post URL

1. Right-click on a post → "Copy Post Link"
2. Or click the post date/time to open individual view
3. Copy the URL from browser (format: `https://t.me/channelname/12345`)

### Step 3: Update the Admin Endpoint

Edit `app/api/admin/update-incidents/route.ts`:

```typescript
{
  title: 'Large demonstration in Tehran',
  twitterUrl: 'https://x.com/Shayan86/status/2005987583445090377',
  telegramUrl: 'https://t.me/bbcpersian/89234', // ← Replace with actual post URL
  embedType: 'telegram' as const,
  tags: ['Mass Protest', 'Tehran', 'Police Response'],
},
```

### Step 4: Deploy and Update

```bash
# Commit changes
git add -A
git commit -m "feat: add verified Telegram post URLs"
git push

# Deploy to production
vercel deploy --prod

# Update Firestore (requires ADMIN_SECRET env var)
curl -X POST https://persian-uprising-news.vercel.app/api/admin/update-incidents \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

## Important Notes

### ⚠️ Current Status
- **Channel names**: ✅ Verified (legitimate news sources)
- **Post IDs**: ⚠️ **PLACEHOLDERS** - need verification with actual posts

### Post ID Verification Checklist

Before deploying, verify each Telegram URL:
- [ ] BBC Persian posts exist and are recent
- [ ] Iran International posts exist and are recent
- [ ] VOA Persian posts exist and are recent
- [ ] Manoto TV posts exist and are recent
- [ ] All URLs follow format: `https://t.me/channel/post_id`
- [ ] Posts contain video/media (for best embed experience)

### Why Placeholders?

I cannot access Telegram directly to verify:
1. Which specific posts exist
2. Which posts contain relevant protest videos
3. Current post ID numbers (they change constantly)

**You or someone with Telegram access should**:
1. Visit each channel
2. Find recent protest-related posts
3. Replace placeholder IDs with real ones

## Alternative: Use Twitter Only

If Telegram verification is difficult, you can:
1. Keep `embedType: 'twitter'` for all incidents
2. Remove or comment out `telegramUrl` fields
3. The app will still work perfectly with Twitter embeds only

## Example of Finding Real Posts

### BBC Persian Example:
1. Visit `https://t.me/bbcpersian`
2. Scroll to find recent protest coverage
3. Click post date → URL shows: `https://t.me/bbcpersian/123456`
4. Use `123456` as the post ID

### What Makes a Good Post:
- ✅ Contains video footage
- ✅ Related to protests/incidents
- ✅ Recent (last 30 days)
- ✅ From verified channel
- ❌ Avoid: Text-only posts, old posts, unverified sources

## Testing Telegram Embeds

After updating with real URLs:

1. **Visit map**: `https://persian-uprising-news.vercel.app/map`
2. **Click incident marker**
3. **Check side panel** for "Telegram Video" section
4. **Verify**: Video embeds or shows "View on Telegram" fallback

## Telegram Embed Limitations

Telegram embeds may not always work due to:
- **Privacy settings**: Channel may block embeds
- **Regional restrictions**: Some regions block Telegram widgets
- **Mobile limitations**: iOS Safari has embed restrictions

**Fallback behavior**: If embed fails, shows "View on Telegram" link
