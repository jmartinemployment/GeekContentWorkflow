# Geek Content Workflow.ai Behaviors

## Global
- **Lenis smooth scroll** active (`html.lenis`)
- No scroll-snap
- Page background `#F9FAFB`

## Navbar
- Fixed at top, z-index 9
- Frosted pill: `background: rgba(250,250,250,0.75)`, `backdrop-filter: blur(10px)`, `border-radius: 999px`
- Shadow: `inset 0 2px 4px rgba(255,255,255,0.05), 0 8px 24px -8px rgba(9,9,11,0.24)`
- **No visual change** between scrollY=0 and scrollY=400 (same styles)
- Features / Explore have chevron dropdowns (hover/click)
- Academy has "New" badge

## Hero
- Particle/starfield video (`hero-particles.mp4`) absolute behind content, autoplay muted loop
- Inline brand icons inside H1 (Geek Content Workflow, Google, OpenAI, rocket)
- "LEARN MORE" scrolls down (clickable)

## Feature Spread — INTERACTION MODEL: click-driven tabs
Tabs: Brand Core | Strategy Map | AI Drafting | CMS Publish | Site Analytics
Each click swaps: title (h4), description paragraph, and feature image.
Transition: opacity crossfade (~300ms typical Framer)

### Tab content
1. **Brand Core** → "Brand Intelligence" / Teach Geek Content Workflow your business once… / `feature-brand-core.png`
2. **Strategy Map** → "Content Strategy Map" / A living content plan… / `feature-strategy-map.png`
3. **AI Drafting** → "AI Drafting" / Skip the blank page… / `feature-ai-drafting.png`
4. **CMS Publish** → "Publishing Integrations" / Plan, schedule & finished… / `feature-cms-publish.png`
5. **Site Analytics** → "Performance Metrics" / See how every piece… / `feature-site-analytics.png`

## 30 Days — INTERACTION MODEL: click-driven tabs
Tabs: Today | Week in | Month in — highlight active, show corresponding column content (all three columns visible as cards; tabs may emphasize)

## FAQ — INTERACTION MODEL: click-driven accordion
- One item open at a time (opening another closes previous)
- Closed height ~59–63px; open expands with answer text
- Plus/minus or chevron indicator

### Known answers
- **How is this different from ChatGPT…**: Generic AI tools start from scratch every time. Geek Content Workflow learns your brand, audience, and competitors during onboarding—then uses that context for every piece of content. Plus, it handles the full workflow: research, drafting, editing, publishing, analytics and optimization. Not just the writing.

## Hover states
- Primary black CTAs: slight brightness lift / opacity
- Nav links: color toward darker zinc
- Feature tabs: active tab gets darker/heavier weight + underline or pill highlight
- Blog cards: slight lift / image scale
- FAQ rows: cursor pointer

## Responsive
- **1440**: multi-column layouts, pill nav desktop
- **768**: nav may compress; grids → 2 col
- **390**: stacked single column; hamburger or simplified nav; feature tabs scroll horizontally
