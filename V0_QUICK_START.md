# V0 Quick Start - 5 Minute Setup

## Important: V0 Doesn't Accept Zip Files

V0 works by **generating** new styled components from screenshots/prompts, not by importing existing code.

## The Right Way to Use V0

### Step 1: Run Your App
```bash
npm run dev
# Visit http://localhost:3000
```

### Step 2: Take Screenshots

**Priority Screenshots:**
1. **Homepage** (http://localhost:3000)
   - Full page view
   - Close-up of one news card

2. **Map Page** (http://localhost:3000/map)
   - Full view with filters
   - Click a marker to show the modal
   - Screenshot the modal

3. **Report Page** (http://localhost:3000/report)
   - Full form view

**How to Screenshot:**
- Mac: `Cmd+Shift+4` then space (full window)
- Windows: `Win+Shift+S`
- Or use browser DevTools full page screenshot

### Step 3: Go to V0
1. Visit https://v0.dev
2. Sign in with GitHub/Google
3. Click "New" to start

### Step 4: Upload & Prompt

**Example for News Feed:**
```
Upload the homepage screenshot, then type:

"Redesign this news feed component with modern glassmorphism cards,
smooth animations, better spacing, and professional typography.
Keep the translate button and verification badges.
Use shadcn/ui components with Tailwind CSS. Make it mobile-responsive."
```

**Example for Incident Modal:**
```
Upload the modal screenshot, then type:

"Redesign this incident modal with:
- Cleaner header with better badge styling
- Improved metadata grid layout
- Social share icons as circular buttons
- Smooth animations when opening/closing
- Better mobile responsiveness
Use shadcn/ui components. Keep all functionality."
```

### Step 5: Get the Code

1. V0 generates the styled component
2. Click "Code" tab to see the implementation
3. Click "Add to Codebase" for shadcn CLI command
4. Or manually copy the code

### Step 6: Integrate

```bash
# Install shadcn/ui if needed
npx shadcn-ui@latest init

# Add components V0 uses
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
npx shadcn-ui@latest add badge
# etc.

# Then copy V0's code into your component files
```

## Quick Prompts for Each Component

### 1. News Feed Card
```
Make this news card modern with glassmorphism, better spacing,
smooth hover animations, and a cleaner layout. Keep translate
button and source badges. Use shadcn/ui.
```

### 2. Map Filters
```
Redesign these filter chips with active states, better colors,
count badges, and smooth transitions. Use shadcn/ui Badge component.
```

### 3. Incident Modal
```
Make this modal more polished with better spacing, improved
metadata grid, animated entrance, and circular social share
buttons. Use shadcn/ui Dialog component.
```

### 4. Report Form
```
Create a modern multi-step form with validation, better input
styling, image upload preview, and success states. Use shadcn/ui
Form components with React Hook Form.
```

## Tips

✅ **Do:**
- Upload clear, full-resolution screenshots
- Specify "use shadcn/ui" in every prompt
- Ask for mobile responsiveness
- Request dark mode compatibility
- Iterate - refine with follow-up prompts

❌ **Don't:**
- Try to upload code files (won't work)
- Generate entire pages at once (break into components)
- Forget to mention existing functionality to preserve

## Next Steps

1. Take the 4 priority screenshots (5 minutes)
2. Upload to V0 one at a time (15 minutes)
3. Copy generated code into your project (30 minutes)
4. Test and adjust (20 minutes)

**Total time: ~1 hour to restyle the entire app**

---

Need help? See `V0_STYLING_GUIDE.md` for detailed prompts and integration steps.
