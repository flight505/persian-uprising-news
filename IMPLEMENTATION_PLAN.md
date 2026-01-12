# Critical Implementation Plan - Match Iran-main Experience

## Priority 1: Side Panel (Replace Modal)

### Desktop (Right Side Panel)
- Width: 400-500px
- Slide in from right with animation
- Map remains visible on left
- Scrollable content inside panel

### Mobile (Bottom Sheet)
- Height: 66% of screen initially
- Draggable to full height
- Slide up from bottom
- Map visible above

### Animation
```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

## Priority 2: Twitter/Media Embed Component

### Implementation
```typescript
// Use Twitter widget API
const TweetEmbed = ({ url, isDarkMode }) => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!url || !containerRef.current) return;
    const tweetId = url.split('/').pop().split('?')[0];

    if (window.twttr && window.twttr.widgets) {
      window.twttr.widgets.createTweet(
        tweetId,
        containerRef.current,
        {
          theme: isDarkMode ? 'dark' : 'light',
          cards: 'visible',
          conversation: 'none',
          align: 'center',
          width: '100%',
        }
      ).then(() => setIsLoading(false));
    }
  }, [url, isDarkMode]);

  return (
    <div ref={containerRef}>
      {isLoading && <LoadingSpinner />}
    </div>
  );
};
```

### Twitter Script Loading
```html
<script async src="https://platform.twitter.com/widgets.js"></script>
```

## Priority 3: Timeline with Actual Filtering

### State Management
```typescript
const [dateFilter, setDateFilter] = useState<string | null>(null);
const [isPlaying, setIsPlaying] = useState(false);

// Get unique dates from all incidents
const uniqueDates = useMemo(() => {
  return [...new Set(incidents.map(i => i.timestamp))].sort();
}, [incidents]);

// Filter incidents by selected date
const displayedIncidents = useMemo(() => {
  if (!dateFilter) return incidents; // Show all
  return incidents.filter(i => i.timestamp === dateFilter);
}, [incidents, dateFilter]);
```

### Playback Logic
```typescript
useEffect(() => {
  let interval: NodeJS.Timeout;

  if (isPlaying && uniqueDates.length > 0) {
    interval = setInterval(() => {
      setDateFilter(currentDate => {
        if (!currentDate) return uniqueDates[0];

        const currentIndex = uniqueDates.indexOf(currentDate);
        if (currentIndex < uniqueDates.length - 1) {
          return uniqueDates[currentIndex + 1];
        } else {
          setIsPlaying(false);
          return currentDate;
        }
      });
    }, 1500); // 1.5 seconds per date
  }

  return () => clearInterval(interval);
}, [isPlaying, uniqueDates]);
```

### Timeline UI
```tsx
<div className="timeline-container">
  <button onClick={() => setIsPlaying(!isPlaying)}>
    {isPlaying ? <IconPause /> : <IconPlay />}
  </button>

  <input
    type="range"
    min="0"
    max={uniqueDates.length - 1}
    value={dateFilter ? uniqueDates.indexOf(dateFilter) : 0}
    onChange={(e) => {
      setIsPlaying(false);
      setDateFilter(uniqueDates[e.target.value]);
    }}
  />

  <button onClick={() => { setDateFilter(null); setIsPlaying(false); }}>
    ALL
  </button>

  <span>
    {dateFilter ? formatDate(dateFilter) : "SHOWING ALL EVENTS"}
  </span>
</div>
```

## Priority 4: Load All Incidents

### Current Problem
```typescript
// ❌ BAD: Only shows 20 recent
const incidents = await incidentService.getAll({ limit: 20 });
```

### Fix
```typescript
// ✅ GOOD: Load all incidents, filter client-side
const allIncidents = await incidentService.getAll(); // No limit
// Then filter by timeline on client
```

## Priority 5: Data Structure for Media

### Incident Interface Update
```typescript
interface Incident {
  id: string;
  type: 'protest' | 'arrest' | 'injury' | 'death' | 'other';
  title: string;
  description: string;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  timestamp: number;
  verified: boolean;

  // NEW: Media fields
  twitterUrl?: string;        // Primary Twitter post URL
  alternateUrl?: string;      // Alternate angle/view
  mediaUrls?: string[];       // Direct image/video URLs
  embedType?: 'twitter' | 'image' | 'video';

  // NEW: Rich metadata
  tags?: string[];            // ["Gunfire", "Deaths"]
  confidence?: number;        // 0-100
}
```

## File Changes Required

### 1. Create New Components
- `app/components/Map/IncidentSidePanel.tsx` - Replace IncidentModal
- `app/components/Map/TweetEmbed.tsx` - Twitter embedding
- `app/components/Map/TimelinePlayer.tsx` - Timeline with play/pause
- `app/components/Map/BottomSheet.tsx` - Mobile draggable panel

### 2. Modify Existing
- `app/components/Map/IncidentMap.tsx` - Use side panel instead of modal
- `app/map/page.tsx` - Add timeline player
- `lib/firestore.ts` - Update Incident interface

### 3. Add Dependencies
```bash
npm install framer-motion  # For smooth animations
```

### 4. Add Twitter Widget Script
```typescript
// app/layout.tsx
<Script
  src="https://platform.twitter.com/widgets.js"
  strategy="lazyOnload"
/>
```

## Implementation Order

### Day 1: Side Panel
1. Create IncidentSidePanel component
2. Add slide-in animations
3. Replace modal in IncidentMap
4. Test desktop + mobile layouts

### Day 2: Media Embedding
1. Create TweetEmbed component
2. Load Twitter widgets script
3. Update Incident interface for media URLs
4. Test embedded videos/images

### Day 3: Timeline Filtering
1. Create TimelinePlayer component
2. Implement play/pause logic
3. Wire up date filtering
4. Test timeline animation

### Day 4: Load All Data
1. Remove pagination limits
2. Load all incidents
3. Optimize with useMemo
4. Test performance

### Day 5: Polish
1. Add smooth animations
2. Test on mobile
3. Fix any bugs
4. Deploy

## Key Animations

```css
/* Desktop side panel */
.side-panel {
  animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Mobile bottom sheet */
.bottom-sheet {
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fade in markers */
.marker {
  animation: fade-in 0.2s ease-out;
}
```

## Testing Checklist

- [ ] Desktop: Panel slides in from right, map visible
- [ ] Mobile: Sheet slides up from bottom, draggable
- [ ] Twitter videos play inline
- [ ] Timeline play/pause works
- [ ] Slider moves through dates
- [ ] "ALL" button shows all incidents
- [ ] Map updates as timeline plays
- [ ] Performance is smooth with 200+ incidents

## Success Criteria

1. UX matches Iran-main reference
2. Videos/media display inline
3. Timeline actually filters incidents
4. All incidents load (not just 20)
5. Smooth animations throughout
6. Mobile experience is excellent
