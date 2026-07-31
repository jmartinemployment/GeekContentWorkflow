# Geek Content Workflow.ai Homepage Topology

Source: https://www.geekatyourspot.com/ (Framer site, Lenis smooth scroll)
Desktop viewport: 1440×900 · Full page height: ~10109px
Mobile viewport: 390×844 · Full page height: ~10466px

## Global

- Background: `rgb(249, 250, 251)` (`#F9FAFB`)
- Smooth scroll: Lenis (`.lenis` on `<html>`)
- Fixed overlay: floating pill navbar (`z-index: 9`)

## Sections (top → bottom)

| # | Name | Framer name / id | Approx top | Height | Interaction |
|---|------|------------------|------------|--------|-------------|
| 0 | Navbar | `Desktop [Boxed]` / Main Area | fixed | 86px container | hover dropdowns Features/Explore |
| 1 | Hero | `Main wrapper` | 0 | 611 | static + particle video bg |
| 2 | Product Screen | `Screen` | 631 | 768 | static product screenshot + floating integration icons |
| 3 | How it Works | `#how-it-works` | 1535 | 875 | scroll reveal / timeline |
| 4 | Feature Spread | `feature spread` | 2429 | 834 | **click-driven** tabs (5 features) |
| 5 | Deep Research | `deep research` | 3283 | 431 | static + status chips |
| 6 | Stats / Why Care | `why you should care` | 3734 | 588 | static stats card |
| 7 | Results / Receipts | `why you should care` / `gcw growth` | 4341 | 623 | static testimonial + iframe |
| 8 | 30 Days | `30 days` | 4984 | 635 | **click-driven** tabs Today / Week in / Month in |
| 9 | CTA Engine | `Section 6` | 5639 | 844 | static dark CTA with image |
| 10 | Blog | `#blog` | 6503 | 1722 | static article cards |
| 11 | FAQ | `FAQ` | 8245 | 1080 | **click-driven** accordion |
| 12 | Footer | `Light [Desktop]` / `top footer` | 9345 | 744 | static links + CTA |

## Layout notes

- Page is a single scroll document (no scroll-snap).
- Navbar is fixed, frosted glass pill, centered, max-width 1200px.
- Hero has absolute-positioned particle video behind text.
- Feature tabs switch image + title + description on click.
- Footer sits inside FAQ flow as sibling `Light [Desktop]` below FAQ items.
