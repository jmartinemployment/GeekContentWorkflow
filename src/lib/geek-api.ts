import { requireAccessToken } from "@/lib/auth/session";
import { apiConfig, type Department, type LlmProvider } from "@/lib/config";

export class GeekApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "GeekApiError";
  }
}

/**
 * Server-only calls to GeekAPI.
 * CWV2 routes are mounted on GeekAPI (ContentWriter.Api ApplicationPart).
 */
export async function geekApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await requireAccessToken();
  const url = path.startsWith("http")
    ? path
    : `${apiConfig.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const message =
      typeof body === "object" && body && "title" in body
        ? String((body as { title: unknown }).title)
        : typeof body === "object" && body && "error" in body
          ? String((body as { error: unknown }).error)
          : typeof body === "string" && body
            ? body
            : `GeekAPI ${res.status}`;
    throw new GeekApiError(message, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return undefined as T;
}

// —— Clients (Brand Core) ——

export type CwClient = {
  id: string;
  name: string;
  notes?: string | null;
  createdAtUtc: string;
  publishTarget?: unknown;
};

export function listClients() {
  return geekApiFetch<CwClient[]>("/api/clients");
}

export function createClient(body: { name: string; notes?: string | null }) {
  return geekApiFetch<CwClient>("/api/clients", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// —— Projects (Strategy / content engine) ——

export type ProjectSummary = {
  id: string;
  clientId: string;
  name: string;
  projectUrl: string;
  targetKeyword: string;
  department: string;
  status: string;
  preferredProvider: string;
  useExactKeywordAsTitle: boolean;
  createdAtUtc: string;
};

export type GeneratedContent = {
  id: string;
  contentType: string;
  title: string;
  slug: string;
  metaDescription?: string | null;
  keywords: string[];
  wordCount: number;
  bodyHtml: string;
  createdAtUtc: string;
  gaps?: string[];
  noResearchWarning?: string | null;
};

export type ProjectDetail = ProjectSummary & {
  crawl?: {
    siteName: string;
    pagesCrawled: number;
    detectedTone: string;
    detectedFocus: string;
  } | null;
  notes?: string | null;
  generatedContent: GeneratedContent[];
  contentSet?: unknown;
};

export function listProjects() {
  return geekApiFetch<ProjectSummary[]>("/api/projects");
}

export function getProject(id: string) {
  return geekApiFetch<ProjectDetail>(`/api/projects/${id}`);
}

export function createProject(body: {
  clientId: string;
  name: string;
  projectUrl: string;
  targetKeyword: string;
  department: Department;
  preferredProvider: LlmProvider;
  useExactKeywordAsTitle?: boolean;
}) {
  return geekApiFetch<ProjectSummary>("/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProjectNotes(id: string, notes: string | null) {
  return geekApiFetch<ProjectDetail>(`/api/projects/${id}/notes`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

export function crawlProject(id: string) {
  return geekApiFetch<unknown>(`/api/projects/${id}/crawl`, { method: "POST" });
}

export function generateAll(id: string) {
  return geekApiFetch<unknown>(`/api/projects/${id}/generate`, {
    method: "POST",
  });
}

export function generatePillar(id: string) {
  return geekApiFetch<unknown>(`/api/projects/${id}/generate/pillar`, {
    method: "POST",
  });
}

export function generateBlog(id: string) {
  return geekApiFetch<unknown>(`/api/projects/${id}/generate/blog`, {
    method: "POST",
  });
}

export function commitHtmlExport(id: string) {
  return geekApiFetch<unknown>(`/api/projects/${id}/export/html/commit`, {
    method: "POST",
  });
}

// —— Campaigns + Strategy Briefs (GCW facade over Repository) ——

export const BUYING_STAGES = ["awareness", "research", "decision"] as const;
export type BuyingStage = (typeof BUYING_STAGES)[number];

export type GcwCampaign = {
  id: string;
  clientId: string;
  name: string;
  keyword: string;
  status: string;
  profileVersionId: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  rowVersion: number;
};

export type StrategyBrief = {
  id: string;
  campaignId: string;
  painPointId: string;
  audienceProfile: string;
  buyingStage: string;
  angle: string;
  callToAction: string;
  status: "draft" | "approved" | "rejected" | string;
  rowVersion: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export function listCampaigns(clientId: string) {
  return geekApiFetch<GcwCampaign[]>(
    `/api/gcw/campaigns?clientId=${encodeURIComponent(clientId)}`,
  );
}

export function getCampaign(id: string) {
  return geekApiFetch<GcwCampaign>(`/api/gcw/campaigns/${id}`);
}

export function createCampaign(body: {
  clientId: string;
  name: string;
  keyword: string;
}) {
  return geekApiFetch<GcwCampaign>("/api/gcw/campaigns", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCampaignStatus(id: string, status: string) {
  return geekApiFetch<GcwCampaign>(`/api/gcw/campaigns/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listStrategyBriefs(campaignId: string) {
  return geekApiFetch<StrategyBrief[]>(
    `/api/gcw/strategy-briefs?campaignId=${encodeURIComponent(campaignId)}`,
  );
}

export function getStrategyBrief(id: string) {
  return geekApiFetch<StrategyBrief>(`/api/gcw/strategy-briefs/${id}`);
}

export function createStrategyBrief(body: {
  campaignId: string;
  audienceProfile: string;
  buyingStage: string;
  angle: string;
  callToAction: string;
  painPointId?: string | null;
}) {
  return geekApiFetch<StrategyBrief>("/api/gcw/strategy-briefs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateStrategyBrief(
  id: string,
  body: {
    audienceProfile: string;
    buyingStage: string;
    angle: string;
    callToAction: string;
  },
) {
  return geekApiFetch<StrategyBrief>(`/api/gcw/strategy-briefs/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function approveStrategyBrief(id: string) {
  return geekApiFetch<StrategyBrief>(`/api/gcw/strategy-briefs/${id}/approve`, {
    method: "PATCH",
  });
}

export function rejectStrategyBrief(id: string) {
  return geekApiFetch<StrategyBrief>(`/api/gcw/strategy-briefs/${id}/reject`, {
    method: "PATCH",
  });
}

// —— Client profiles + versions (GCW facade over Repository) ——

export type ClientProfile = {
  id: string;
  clientId: string;
  name: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ClientProfileVersion = {
  id: string;
  profileId: string;
  version: number;
  approvedFacts: Record<string, unknown>;
  prohibitedClaims: Record<string, unknown>;
  createdAtUtc: string;
  rowVersion: number;
};

export function getClientProfileByClientId(clientId: string) {
  return geekApiFetch<ClientProfile>(
    `/api/gcw/client-profiles/by-client/${encodeURIComponent(clientId)}`,
  );
}

export function getClientProfile(id: string) {
  return geekApiFetch<ClientProfile>(`/api/gcw/client-profiles/${id}`);
}

export function createClientProfile(body: { clientId: string; name: string }) {
  return geekApiFetch<ClientProfile>("/api/gcw/client-profiles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listClientProfileVersions(profileId: string) {
  return geekApiFetch<ClientProfileVersion[]>(
    `/api/gcw/client-profile-versions?profileId=${encodeURIComponent(profileId)}`,
  );
}

export function getClientProfileVersion(id: string) {
  return geekApiFetch<ClientProfileVersion>(
    `/api/gcw/client-profile-versions/${id}`,
  );
}

export function createClientProfileVersion(body: {
  profileId: string;
  approvedFacts?: Record<string, unknown>;
  prohibitedClaims?: Record<string, unknown>;
}) {
  return geekApiFetch<ClientProfileVersion>("/api/gcw/client-profile-versions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
