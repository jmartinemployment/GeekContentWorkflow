# Session handoff — Geek Content Workflow

**Date:** 2026-07-31  
**Live app:** https://geekcontentworkflow.geekatyourspot.com  
**Repos:**
- Frontend: `/Users/jeffmartin/development/GeekContentWorkflow`
- Backend: `/Users/jeffmartin/development/GeekBackend`

Cursor agent tooling intermittently returned `Service temporarily unavailable` late in this session, which blocked starting Workspaces. Use this doc to resume without re-deriving context.

---

## Product constraints (non-negotiable)

- No Prisma / local DB from Next — GeekOAuth + GeekAPI only.
- **Never** call `/api/content-writer/v3/*` from GCW.
- Ship via **`/api/gcw/*`** facades over `HttpContentWriterV3Repository` → GeekRepository.
- CWV3 is design reference only.
- Test account: `gcw-smoke@geekatyourspot.com` / password in `.env.local` as `GCW_TEST_PASSWORD` (also `GCW_TEST_EMAIL`).

---

## What shipped (PLAN build sequence)

All smoke-tested against production unless noted.

| Slice | Status | Notes |
|-------|--------|--------|
| Deploy + auth | Done | PKCE; callback hard nav + session `cache()` / rate-limit fixes earlier |
| Strategy Briefs P0 | Done | |
| Brand Core profiles/versions P1 | Done | `/app/brand-core`, `/app/brand-core/[clientId]` |
| Campaigns & keywords on Strategy Map | Done | CWV2 projects moved to `/app/drafting` |
| Pain points | Done | |
| Research runs / sources / evidence | Done | |
| Reconciliation | Done | List filtered `pending` only → fixed in GeekRepository; required deploy |
| Assets / draft versions / reviews / approvals | Done | |
| Publications + analytics rollups | Done | |
| **Brand voice links (remaining P1 Brand)** | **Done 2026-07-31** | See brand voices section |
| **Workspaces (tenant above clients)** | **Done 2026-07-31** | See workspaces section |
| **Reviews queue + Insights** | **Done 2026-07-31** | `/app/reviews`, `/app/insights` |
| **Horizon B: brand-grounded generate** | **Done 2026-07-31** | `POST /api/gcw/strategy-briefs/{id}/generate` |
| **Horizon B: iterative revise chat** | **Done 2026-07-31** | `POST /api/gcw/asset-versions/{id}/revise` |
| **Horizon B: templates + tones** | **Done 2026-07-31** | `/api/gcw/drafting/templates|tones` |
| **Horizon B: in-editor SEO** | **Done 2026-07-31** | `GET /api/gcw/asset-versions/{id}/seo` |
| **Horizon B: polish ship-check** | **Done 2026-07-31** | `GET /api/gcw/asset-versions/{id}/polish` |
| **Horizon B: repurpose packs** | **Done 2026-07-31** | `POST /api/gcw/asset-versions/{id}/repurpose` |
| **Horizon C: video SEO packs** | **Done 2026-07-31** | `POST /api/gcw/asset-versions/{id}/video-seo` |

### Video SEO packs (latest)

**Backend `37f1eec`:** `GenerateVideoSeoPackAsync` → titles/description/tags/chapters/thumbnails/shorts companions.

**Frontend `992c118`:** `/app/video-seo` + Generate video SEO pack on pillars; smoke `scripts/smoke-video-seo.py` → **PASS**.

**UX fix `8157b8f`:** Asset pages render a readable draft preview (not just JSON). Pack generate lands on the first companion with copyable text. Smoke re-PASS.

### Repurpose packs (prior)

**Backend `b07e048`:** `GenerateRepurposePackAsync` + catalog; creates companion assets (LinkedIn/X/Instagram/Meta/Google/email) from a pillar version.

**Frontend `4b42093`:** `/app/repurpose` + Generate channel pack on pillar assets; smoke `scripts/smoke-repurpose.py` → **PASS**.

### Polish ship-check (prior)

**Backend `8735f22`:** `GcwPolishAnalyzer` + `GET /api/gcw/asset-versions/{id}/polish` (clarity/filler/placeholders/prohibited claims + `shipReady`).

**Frontend `8317e3c`:** Polish panel on asset page; submit/approve blocked when `!shipReady`; smoke `scripts/smoke-polish.py` → **PASS**.

### In-editor SEO (prior)

**Backend `452967e`:** `GcwSeoAnalyzer` + `GET /api/gcw/asset-versions/{id}/seo` (campaign keyword heuristics + applyFeedback).

**Frontend `aaec0ec`:** SEO panel on asset page (score/checks + Apply SEO fixes → revise); smoke `scripts/smoke-seo.py` → **PASS**.

### Templates + tones (prior)

**Backend `c1b58c7`:** Drafting catalog + template/tone guidance on generate/revise.

**Frontend `7488671`:** Template/tone selects on brief generate and asset revise; smoke `scripts/smoke-templates-tones.py` → **PASS**.

### Iterative revise (prior)

**Backend `cafc320`:** `ReviseStructuredDraftAsync` on OpenAI/Claude + GCW revise endpoint.

**Frontend `532a80e`:** Revise chat on asset page; smoke `scripts/smoke-revise.py` → **PASS**.

### Brand-grounded generate (prior)

**Backend — GeekBackend commit `892b7fd`:** GCW generate uses brief + evidence + profile facts/voice → ContentDocument asset version.

**Frontend — GeekContentWorkflow commit `b324d24`:** Generate draft on strategy brief detail; smoke `scripts/smoke-generate-draft.py` → **PASS**.

### Reviews + Insights (prior)

**Frontend — GeekContentWorkflow commit `3938bef`:**

- `/app/reviews` — open/resolved comment queue across latest asset versions
- `/app/insights` — recommendation cards from campaigns/keywords/briefs/assets/reconciliation
- `listAllClients()` merges workspace + drafting clients; Strategy Map + Assets updated
- Smoke: `scripts/smoke-reviews-insights.py` → **PASS**

### Workspaces (prior)

**Backend — GeekBackend commit `6c80e3e`:**

- `OwnerId` on Workspace + migration `AddWorkspaceOwnerId`
- List by owner: `repo/content-writer-v3/workspaces?ownerId=`
- GCW: `/api/gcw/workspaces`, `/api/gcw/clients` (workspace-scoped)

**Frontend — GeekContentWorkflow commit `1ac1e74`:**

- Brand Core rebuilt around workspaces + workspace clients
- CWV2 drafting clients kept under a collapsed section
- Smoke: `scripts/smoke-workspaces.py` → **PASS**

### Brand voices (prior completed slice)

**Backend — GeekBackend commit `5c084a1`:**

- `GeekRepository/Repositories/ContentWriterV4/BrandVoiceRepository.cs`
- `GeekRepository/Controllers/ContentWriterV4/BrandVoicesController.cs` → `repo/content-writer-v4/brand-voices`
- EF migration: `GeekRepository/Data/Migrations/ContentWriterV4/20260731200913_InitialContentWriterV4*`
- `IBrandVoiceRepository` registered in `GeekRepository/ServiceRegistration.cs`
- HttpClient methods on `GeekAPI/HttpClients/HttpContentWriterV3Repository.cs` (CWV4 brand voices + existing CWV3 client-brand-voice-links)
- `GeekAPI/Controllers/Gcw/GcwBrandVoicesController.cs`:
  - `GET/POST/PUT /api/gcw/brand-voices` (owner = current user)
  - `GET/POST /api/gcw/brand-voice-links` (by `profileVersionId`; wraps CWV3 `ClientBrandVoiceLink`)

**Frontend — GeekContentWorkflow commit `5df7880`:**

- Typed helpers in `src/lib/geek-api.ts` (`BrandVoice`, `BrandVoiceLink`, list/create/link)
- UI on `src/app/app/brand-core/[clientId]/page.tsx` — create & link, link existing, list on latest profile version
- Smoke: `scripts/smoke-brand-voices.py` → **PASS**

**Deploy notes from that slice:**

- Railway: always `railway status` in the service directory before `railway up --detach` (wrong link has deployed to the wrong project before).
- GeekRepository `railway up` succeeded.
- GeekAPI `railway up` once showed FAILED while a concurrent GitHub auto-deploy succeeded; verify routes return **401** (exist) not **404**.
- GCW: `vercel deploy --prod --yes` from GeekContentWorkflow.
- Custom domain: `geekcontentworkflow.geekatyourspot.com`.

---

## Next work

**Horizon B drafting excellence** — complete.

**Horizon C** (in progress): video SEO packs live. Still open: social calendar, image-generator integration, transcript import.

User preference: when they say **continue**, pick the next clear item and implement.

---

## Key frontend surfaces

- `/app/brand-core`, `/app/brand-core/[clientId]`
- `/app/strategy-map` — keywords + campaigns
- `/app/research`, `/app/research/[id]`
- `/app/reconciliation`
- `/app/pain-points`
- `/app/strategy-briefs`, `/app/strategy-briefs/[id]`
- `/app/assets`, `/app/assets/[id]`
- `/app/publications`
- `/app/analytics`
- Helpers: `src/lib/geek-api.ts`
- Smokes: `scripts/smoke-*.py`

## Key backend

- `GeekAPI/Controllers/Gcw/*`
- Pattern: wrap `HttpContentWriterV3Repository`; deploy GeekAPI; some slices also need GeekRepository changes.

## Important bugs fixed earlier

- Reconciliation list returned only `pending` → fixed so all statuses return; required **GeekRepository** deploy.
- Auth: callback hard nav + session `cache()` / OAuth rate limits.

## Deploy cheat sheet

```bash
# GeekRepository
cd /Users/jeffmartin/development/GeekBackend/GeekRepository
railway status   # must show GeekRepository
railway up --detach

# GeekAPI
cd /Users/jeffmartin/development/GeekBackend/GeekAPI
railway status   # must show GeekAPI
railway up --detach
# or rely on GitHub push auto-deploy; curl route → 401 means present, 404 means missing

# GCW
cd /Users/jeffmartin/development/GeekContentWorkflow
vercel deploy --prod --yes

# Smoke example
python3 scripts/smoke-brand-voices.py
```

## Agent / user preferences

- Read `AGENTS.md` / Next docs under `node_modules/next/dist/docs/` before Next API changes (this Next version may differ from training data).
- Don’t edit plan files unless asked.
- Prefer finishing named PLAN groups over inventing partial labels.
- Commits were accepted as part of ship/deploy in this thread; don’t be casually proactive with commits outside that pattern.
- When user says **continue**, implement next sequence item.

---

## Resume prompt (paste to next agent)

```
Continue Geek Content Workflow from SESSION_HANDOFF.md.
Horizon C started: video SEO packs shipped (backend 37f1eec, frontend 992c118).
Next: social calendar, GCW↔image-generator visuals, or transcript import.
Never call /api/content-writer/v3/*.
```
