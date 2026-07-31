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

### Workspaces (latest completed slice)

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

**P1 Brand / client intelligence is complete** (profiles, versions, brand voices, workspaces).

Suggested next from PLAN / LONG_TERM:

- Longer-horizon items in `LONG_TERM_PLAN.md`, or polish/migrate drafting clients fully onto workspaces if desired.

User preference: when they say **continue**, pick the next clear PLAN/LONG_TERM item and implement without long planning debates.

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
P1 Brand is done (profiles, voices, workspaces — smoke PASS).
Next: pick the next PLAN / LONG_TERM_PLAN item and implement via /api/gcw/* facades.
Never call /api/content-writer/v3/*.
Latest: backend 6c80e3e, frontend 1ac1e74.
```
