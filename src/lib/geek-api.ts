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
