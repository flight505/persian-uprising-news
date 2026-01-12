# V0 Styling Guide - Persian Uprising News

## How to Use This Guide with V0

V0 (v0.dev) works by generating styled components from screenshots and prompts. This guide helps you style each component of the Persian Uprising News app.

## Current Tech Stack
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS (ready for shadcn/ui components)
- **Map**: React-Leaflet
- **Icons**: SVG-based

## Components to Style

### 1. News Feed (Homepage)
**Current Location**: `app/page.tsx`, `app/components/NewsFeed/NewsFeed.tsx`

**What to Screenshot**:
- Homepage at http://localhost:3000
- Individual news cards
- Translate button interaction

**V0 Prompt Template**:
```
Create a modern news feed component for a Persian uprising news aggregator with:
- Card-based layout with glassmorphism effects
- Article title, summary, source, and timestamp
- Translate button (Farsi ↔ English) with smooth transitions
- Image thumbnails with lazy loading
- Infinite scroll support
- Dark mode compatible
- Verification badges (✓ Verified, ⏳ Pending)
- Upvote functionality with heart icons

Tech: Next.js 15, Tailwind CSS, shadcn/ui
```

### 2. Incident Map
**Current Location**: `app/map/page.tsx`, `app/components/Map/IncidentMap.tsx`

**What to Screenshot**:
- Map page at http://localhost:3000/map
- Incident filters (All, Protests, Arrests, etc.)
- Legend showing incident types

**V0 Prompt Template**:
```
Create a modern map interface sidebar with:
- Filter chips for incident types (Protest, Arrest, Injury, Casualty, Other)
- Active count badges on each filter
- Toggle for verified/unverified incidents
- Heatmap toggle button
- Timeline slider component
- Legend with color-coded incident types
- Refresh button with loading state
- Dark mode compatible

Color Scheme:
- Protest: red-500 (#ef4444)
- Arrest: amber-500 (#f59e0b)
- Injury: orange-500 (#f97316)
- Casualty: red-600 (#dc2626)
- Other: indigo-500 (#6366f1)

Tech: Next.js 15, Tailwind CSS, shadcn/ui
```

### 3. Incident Modal
**Current Location**: `app/components/Map/IncidentModal.tsx`

**What to Screenshot**:
- Click any marker on the map to open modal
- Modal with all sections visible

**V0 Prompt Template**:
```
Create a modern incident details modal with:
- Header with incident type badge and verification status
- Close button (X)
- Two-column metadata grid (Location, Time, Source, Engagement)
- Description section
- Related articles list with links
- Social share buttons (Twitter/X, Telegram, WhatsApp, Facebook, Copy Link)
  - Circular icon buttons with brand colors
  - Hover effects with scale(1.1)
- Admin verification button (conditional)
- Footer with incident ID and timestamp
- Smooth animations
- Dark mode compatible
- Mobile responsive (single column on small screens)

Tech: Next.js 15, Tailwind CSS, shadcn/ui, Framer Motion for animations
```

### 4. Report Incident Form
**Current Location**: `app/report/page.tsx`

**What to Screenshot**:
- Report page at http://localhost:3000/report

**V0 Prompt Template**:
```
Create a modern incident reporting form with:
- Card-based layout with sections
- Incident type selector (radio buttons with icons)
- Title input (max 200 chars with counter)
- Description textarea (max 1000 chars with counter)
- Location picker (map integration)
  - Click map to select coordinates
  - Display selected address
- Image upload (max 3 files, drag & drop)
  - Preview thumbnails
  - Remove button per image
- Submit button with loading state
- Form validation with inline errors
- Success/error toast notifications
- Dark mode compatible

Tech: Next.js 15, Tailwind CSS, shadcn/ui, React Hook Form
```

### 5. Navigation & Layout
**Current Location**: `app/layout.tsx`

**What to Screenshot**:
- Full page with navigation
- Mobile menu

**V0 Prompt Template**:
```
Create a modern app navigation with:
- Header with logo and app name
- Navigation links:
  - News Feed (home icon)
  - Map (map icon)
  - Report Incident (plus icon)
- Dark mode toggle (sun/moon icon)
- Notification button (bell icon with badge)
- Mobile hamburger menu
- Sticky header on scroll
- Smooth transitions
- Dark mode compatible

Tech: Next.js 15, Tailwind CSS, shadcn/ui
```

## Design System Preferences

### Color Palette
```css
/* Light Mode */
--background: white
--foreground: gray-900
--primary: blue-600
--secondary: gray-200
--accent: indigo-600

/* Dark Mode */
--background: gray-900
--foreground: gray-100
--primary: blue-500
--secondary: gray-800
--accent: indigo-500
```

### Typography
- **Headings**: Font weight 700 (bold)
- **Body**: Font weight 400 (normal)
- **Small text**: Font size 0.875rem (14px)
- **Base**: Inter or system font stack

### Spacing
- Use Tailwind's spacing scale (4px base)
- Card padding: `p-6` (24px)
- Section gaps: `gap-4` (16px)
- Button padding: `px-4 py-2` (16px x 8px)

### Border Radius
- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Badges: `rounded-full` (pill shape)

### Shadows
- Cards: `shadow-lg`
- Modals: `shadow-2xl`
- Hover: `hover:shadow-xl`

## Integration Steps

After generating components in V0:

1. **Export Code**: Copy the generated component code
2. **Install shadcn/ui** (if not already):
   ```bash
   npx shadcn-ui@latest init
   ```
3. **Add Components**: Install specific shadcn components as needed:
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add badge
   npx shadcn-ui@latest add dialog
   npx shadcn-ui@latest add form
   ```
4. **Replace Files**: Integrate V0 code into existing component files
5. **Test**: Run `npm run dev` and test all functionality
6. **Adjust**: Fine-tune animations, responsiveness, and dark mode

## Screenshots to Take

### Priority 1 (Core Pages)
1. Homepage (news feed) - desktop & mobile
2. Map page - desktop & mobile
3. Incident modal - all sections visible
4. Report form - empty and filled states

### Priority 2 (Components)
5. Individual news card
6. Filter chips on map
7. Social share buttons
8. Navigation header

### Priority 3 (States)
9. Loading states
10. Error states
11. Success confirmations
12. Dark mode versions

## Taking Screenshots

### Desktop (1920x1080):
```bash
# Use browser DevTools
# Right-click → Inspect → Device Toolbar
# Set to "Responsive" and adjust width to 1920px
# Take full page screenshot
```

### Mobile (375x812 - iPhone 13):
```bash
# Use browser DevTools
# Select "iPhone 13" from device list
# Take full page screenshot
```

### Tips:
- Hide browser UI (use full screen mode)
- Show different states (loading, error, success)
- Capture hover effects with separate screenshots
- Include dark mode versions

## V0 Best Practices

1. **Break Down Components**: Upload one component at a time (navbar, card, modal)
2. **Iterate**: Start simple, then add complexity
3. **Specify Tech Stack**: Always mention Next.js 15, Tailwind CSS, shadcn/ui
4. **Include Interactions**: Describe hover effects, animations, transitions
5. **Mobile First**: Specify mobile responsiveness requirements
6. **Dark Mode**: Always request dark mode compatibility

## Example V0 Workflow

1. Go to https://v0.dev
2. Click "New" to start a chat
3. Upload screenshot (or describe component)
4. Use prompt template from above
5. Review generated code
6. Click "Add to Codebase" to get shadcn CLI command
7. Or copy code manually and integrate

## Notes

- V0 generates TypeScript/TSX by default (matches our stack)
- Components use Tailwind CSS (already in project)
- shadcn/ui components are customizable and match our design
- All generated code is production-ready

## Helpful Resources

- V0 Documentation: https://v0.dev/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com

---

**Ready to Style?** Start by taking screenshots of the homepage and uploading to V0 with the News Feed prompt template!
