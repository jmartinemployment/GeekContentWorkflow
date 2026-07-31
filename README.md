# GeekContentWorkflow

AI content marketing workflow for Geek — strategy, research, drafting, publishing, and performance — built on GeekOAuth and GeekAPI (Content Writer v2).

## Product scope

1. **Strategy & planning** — brand / client context and content projects  
2. **Ideation & research** — site crawl and topic signals  
3. **Content creation & editing** — generate pillar and blog drafts  
4. **Scheduling & publishing** — publish via CWV2 HTML commit path  
5. **Performance & tracking** — project status rollup (analytics deepen later)

Marketing site plus authenticated `/app` shell. Display name: **Geek Content Workflow**.

## Stack

```
Next.js (this app)
  → GeekOAuth          auth (OIDC + PKCE)
  → GeekAPI            Content Writer v2
       → GeekRepository → Supabase
```

This app never calls GeekRepository or the database directly. Do not use Content Writer v3.

## Environment

Set on the deploy host (Vercel). See `.env.example`.

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_AUTH_URL` | GeekOAuth base (`https://auth.geekatyourspot.com`) |
| `NEXT_PUBLIC_GEEK_API_URL` | GeekAPI base (`https://api.geekatyourspot.com`) |
| `NEXT_PUBLIC_OAUTH_CLIENT_ID` | Default: `geek-content-workflow` |
| `NEXT_PUBLIC_OAUTH_REDIRECT_URI` | `{APP_URL}/auth/callback` |

Register the OAuth client in GeekOAuth and add the app origin to GeekAPI `CORS_ORIGINS`.

## Scripts

```bash
npm install
npm run build
npm start
```

## Docs

- [`PLAN.md`](./PLAN.md) — **near-term feature pickup** (strategy briefs, research, campaigns, reviews, …)  
- [`LONG_TERM_PLAN.md`](./LONG_TERM_PLAN.md) — **long-term competitive intake** (Claude, ChatGPT, Jasper, Copy.ai, Grammarly, Surfer, VidIQ, Canva, Premiere, Zapier/Make/n8n, HubSpot, Metricool)  
- [`HANDOFF.md`](./HANDOFF.md) — architecture, constraints, deploy checklist  
- [`docs/research/`](./docs/research/) — marketing-page research notes  

## License

Private — Geek At Your Spot.
