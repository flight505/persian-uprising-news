# Testing Guide - Link Functionality

## Fixes Applied

### 1. "Show more" Button Fix
**Problem**: Button wasn't expanding article summaries
**Solution**:
- Lowered threshold from 200 to 150 characters
- Added `e.preventDefault()` and `e.stopPropagation()` to prevent event bubbling
- Added `cursor-pointer` class for visual feedback
- Added console logging for debugging

**File**: `app/components/NewsFeed/NewsCard.tsx` (lines 217-229)

### 2. "Related articles" Fix
**Problem**: Related articles weren't displaying in incident panels
**Solution**:
- Added missing `relatedArticles` field to Incident interface
- Data now flows from API → map page → IncidentMap → IncidentSidePanel

**File**: `app/map/page.tsx` (lines 30-34)

### 3. "Read More" Link Fix (Already Working)
**Status**: ✅ Working correctly
- All articles have valid URLs (Telegram, Twitter)
- Links open in new tabs

## Testing Steps

### Before Testing: Clear Browser Cache
**Option 1 - Easiest**: Visit http://localhost:3002/api/dev/clear-cache and click the button

**Option 2 - Hard Refresh**:
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

### Test 1: "Show more" Button
1. Open http://localhost:3002/
2. Find any article with a long summary (most Farsi articles)
3. Look for the "Show more →" button below the summary
4. Click it
5. **Expected**: Summary expands to show full text
6. Click "← Show less"
7. **Expected**: Summary collapses back to 3 lines

**Debug**: Open browser console (F12) - you should see "Show more clicked, isExpanded: true/false"

### Test 2: "Read more" Links
1. On the home page http://localhost:3002/
2. Scroll through articles
3. Each article has a "Read more →" link in the footer
4. Click any link
5. **Expected**: Opens Telegram or Twitter post in a new tab

### Test 3: "Related articles" in Map
1. Go to http://localhost:3002/map
2. You should see 500 incident markers on the map
3. Click any marker
4. **Expected**: Side panel slides in from the right
5. Scroll down in the side panel
6. **Expected**: See "Related News" section with clickable article links

**Note**: 499 out of 500 incidents have related articles, so almost any marker you click should show them

## Automated Testing

Run the comprehensive test suite:

```bash
# Test all link functionality
npm run test:links

# Test news API URL mapping
npm run test:news-api

# Diagnose UI issues
tsx __tests__/diagnose-ui.ts
```

## Common Issues

### "Show more" still not working
- Clear browser cache again
- Check browser console for errors
- Verify you see the console.log message when clicking

### Related articles not showing
- Make sure you're clicking map markers (not just hovering)
- Check that the side panel opens (slides in from right)
- Scroll down in the panel - related articles are near the bottom
- Verify the marker you clicked has related articles (99.8% do)

### Read more links not working
- Check browser console for errors
- Verify article has a valid URL (not null)
- Try clearing cache and hard refreshing

## Link Types Summary

| Link Type | Location | Behavior | Status |
|-----------|----------|----------|--------|
| **Read more →** | News feed footer | Opens article in new tab | ✅ Working |
| **Show more →** | News feed summary | Expands article text | ✅ Fixed |
| **Related articles** | Map incident panel | Shows source articles | ✅ Fixed |

## Architecture Notes

### Data Flow for Related Articles
```
API (/api/incidents)
  → map/page.tsx (fetches data)
  → IncidentMap component (receives incidents with relatedArticles)
  → IncidentSidePanel (displays relatedArticles in UI)
```

### State Management for "Show more"
```
NewsCard component:
  - isExpanded state (boolean)
  - displaySummary (string from title/summary)
  - line-clamp-3 CSS class (collapses to 3 lines when !isExpanded)
  - Button appears if displaySummary.length > 150
```

## Production Checklist

Before deploying these fixes:
- [ ] Clear cache on local dev server
- [ ] Test all three link types manually
- [ ] Run automated tests (`npm run test:links`)
- [ ] Check browser console for errors
- [ ] Test on mobile viewport (responsive behavior)
- [ ] Deploy to Vercel
- [ ] Test on production URL
- [ ] Instruct users to hard refresh (Cmd+Shift+R) after deployment
