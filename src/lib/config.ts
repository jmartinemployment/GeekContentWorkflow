/**
 * Geek Content Workflow → GeekOAuth → GeekAPI (includes Content Writer v2) → GeekRepository → Supabase.
 * Never call GeekRepository from this app.
 * Content Writer v3 is not used.
 */
const authUrl = (process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:5001").replace(
  /\/$/,
  "",
);
const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const geekApiUrl = (
  process.env.NEXT_PUBLIC_GEEK_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

export const authConfig = {
  authUrl,
  authorizeUrl: `${authUrl}/connect/authorize`,
  tokenUrl: `${authUrl}/connect/token`,
  clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID?.trim() || "geek-content-workflow",
  redirectUri:
    process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI?.trim() || `${appUrl}/auth/callback`,
  scope: "openid profile email offline_access",
  appUrl,
};

export const apiConfig = {
  /** GeekAPI hosts CWV2 controllers at /api/projects, /api/clients, etc. */
  baseUrl: geekApiUrl,
};

export const DEPARTMENTS = [
  "accounting",
  "customer-service",
  "human-resource",
  "marketing",
  "sales",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const LLM_PROVIDERS = ["OpenAi", "Anthropic", "Groq", "LmStudio"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];
