# Navbar Specification

## Overview
- **Target file:** `src/components/Navbar.tsx`
- **Screenshot:** `docs/design-references/desktop-viewport.png`
- **Interaction model:** static (chevrons on Features/Explore; no scroll style change)

## Computed Styles
### Outer container
- position: fixed; z-index: 9; width: 100%; height: 86px; padding: 20px 15px 0

### Main Area (pill)
- display: flex; justify-content: space-between; align-items: center
- padding: 15px 20px; max-width: 1200px; height: 66px
- background: rgba(250, 250, 250, 0.75); backdrop-filter: blur(10px)
- border-radius: 999px
- box-shadow: rgba(255,255,255,0.05) 0px 2px 4px 0px inset, rgba(9,9,11,0.24) 0px 8px 24px -8px

### Logo text
- font: Suisse Intl SemiBold ~29px; color: #09090b

### Nav links
- font: Inter Tight 14px/500; letter-spacing: 0.42px; color: #52525b

## Text Content
Geek Content Workflow | Features | Explore | Pricing | Academy (New) | Sign In | Get Started Free

## Responsive
- Desktop 1440: full pill nav
- Mobile 390: condensed (logo + CTA)
