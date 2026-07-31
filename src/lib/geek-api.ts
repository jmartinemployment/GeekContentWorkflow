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

export const CAMPAIGN_STATUSES = [
  "draft",
  "research",
  "strategy",
  "drafting",
  "published",
  "archived",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

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

// —— Brand voices + profile-version links (GCW facade) ——

export type BrandVoice = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  tone: string;
  sampleText: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type BrandVoiceLink = {
  id: string;
  profileVersionId: string;
  brandVoiceId: string;
  createdAtUtc: string;
};

export function listBrandVoices() {
  return geekApiFetch<BrandVoice[]>("/api/gcw/brand-voices");
}

export function getBrandVoice(id: string) {
  return geekApiFetch<BrandVoice>(`/api/gcw/brand-voices/${id}`);
}

export function createBrandVoice(body: {
  name: string;
  description?: string;
  tone: string;
  sampleText?: string;
}) {
  return geekApiFetch<BrandVoice>("/api/gcw/brand-voices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateBrandVoice(
  id: string,
  body: {
    name: string;
    description?: string;
    tone: string;
    sampleText?: string;
  },
) {
  return geekApiFetch<BrandVoice>(`/api/gcw/brand-voices/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function listBrandVoiceLinks(profileVersionId: string) {
  return geekApiFetch<BrandVoiceLink[]>(
    `/api/gcw/brand-voice-links?profileVersionId=${encodeURIComponent(profileVersionId)}`,
  );
}

export function createBrandVoiceLink(body: {
  profileVersionId: string;
  brandVoiceId: string;
}) {
  return geekApiFetch<BrandVoiceLink>("/api/gcw/brand-voice-links", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// —— Keyword candidates (GCW facade over Repository) ——

export const KEYWORD_STATUSES = [
  "draft",
  "research-queued",
  "researched",
  "briefed",
  "rejected",
] as const;
export type KeywordStatus = (typeof KEYWORD_STATUSES)[number];

export type KeywordCandidate = {
  id: string;
  clientId: string;
  keyword: string;
  searchVolume?: number | null;
  difficulty?: number | null;
  intent?: string | null;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export function listKeywords(clientId: string) {
  return geekApiFetch<KeywordCandidate[]>(
    `/api/gcw/keywords?clientId=${encodeURIComponent(clientId)}`,
  );
}

export function getKeyword(id: string) {
  return geekApiFetch<KeywordCandidate>(`/api/gcw/keywords/${id}`);
}

export function createKeyword(body: {
  clientId: string;
  keyword: string;
  searchVolume?: number | null;
  difficulty?: number | null;
  intent?: string | null;
}) {
  return geekApiFetch<KeywordCandidate>("/api/gcw/keywords", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateKeywordStatus(id: string, status: string) {
  return geekApiFetch<KeywordCandidate>(`/api/gcw/keywords/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// —— Pain points (GCW facade over Repository) ——

export type PainPoint = {
  id: string;
  clientId: string;
  name: string;
  description: string;
  readerSymptom: string;
  costOfInaction: string;
  offerTerminology: string;
  objections: string[];
  confidence: number;
  staleSinceUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export function listPainPoints(clientId: string) {
  return geekApiFetch<PainPoint[]>(
    `/api/gcw/pain-points?clientId=${encodeURIComponent(clientId)}`,
  );
}

export function getPainPoint(id: string) {
  return geekApiFetch<PainPoint>(`/api/gcw/pain-points/${id}`);
}

export function createPainPoint(body: {
  clientId: string;
  name: string;
  description: string;
  readerSymptom: string;
  costOfInaction: string;
  offerTerminology: string;
  objections?: string[];
  confidence?: number;
}) {
  return geekApiFetch<PainPoint>("/api/gcw/pain-points", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// —— Research runs / sources / evidence ——

export const RESEARCH_RUN_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "completed-with-partial-coverage",
] as const;

export const RESEARCH_SOURCE_TYPES = [
  "ExistingInternal",
  "OperatorUploaded",
  "AgentDiscoveredExternal",
] as const;

export const EVIDENCE_SUPPORT_LEVELS = [
  "VerifiedClientFact",
  "VerifiedExternalSource",
  "ObservedMarketLanguage",
  "Unsupported",
] as const;

export type ResearchRun = {
  id: string;
  campaignId: string;
  keyword: string;
  status: string;
  discoveredSourceCount: number;
  spentBudget: number;
  maxBudget: number;
  errorMessage?: string | null;
  createdAtUtc: string;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
};

export type ResearchSource = {
  id: string;
  researchRunId: string;
  sourceType: string;
  url?: string | null;
  title: string;
  description?: string | null;
  createdAtUtc: string;
};

export type ResearchEvidence = {
  id: string;
  researchSourceId: string;
  statement: string;
  supportLevel: string;
  approvedForClaim: boolean;
  confidence: number;
  createdAtUtc: string;
};

export function listResearchRuns(campaignId: string) {
  return geekApiFetch<ResearchRun[]>(
    `/api/gcw/research-runs?campaignId=${encodeURIComponent(campaignId)}`,
  );
}

export function getResearchRun(id: string) {
  return geekApiFetch<ResearchRun>(`/api/gcw/research-runs/${id}`);
}

export function createResearchRun(body: {
  campaignId: string;
  keyword: string;
  maxBudget?: number;
}) {
  return geekApiFetch<ResearchRun>("/api/gcw/research-runs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateResearchRunStatus(
  id: string,
  body: {
    status: string;
    discoveredSourceCount?: number;
    spentBudget?: number;
    errorMessage?: string | null;
  },
) {
  return geekApiFetch<ResearchRun>(`/api/gcw/research-runs/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listResearchSources(researchRunId: string) {
  return geekApiFetch<ResearchSource[]>(
    `/api/gcw/research-sources?researchRunId=${encodeURIComponent(researchRunId)}`,
  );
}

export function createResearchSource(body: {
  researchRunId: string;
  sourceType: string;
  title: string;
  url?: string | null;
  description?: string | null;
}) {
  return geekApiFetch<ResearchSource>("/api/gcw/research-sources", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listResearchEvidence(sourceId: string) {
  return geekApiFetch<ResearchEvidence[]>(
    `/api/gcw/research-evidence?sourceId=${encodeURIComponent(sourceId)}`,
  );
}

export function createResearchEvidence(body: {
  researchSourceId: string;
  statement: string;
  supportLevel: string;
  confidence?: number;
}) {
  return geekApiFetch<ResearchEvidence>("/api/gcw/research-evidence", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function approveResearchEvidence(id: string) {
  return geekApiFetch<ResearchEvidence>(
    `/api/gcw/research-evidence/${id}/approve`,
    { method: "PATCH" },
  );
}

// —— Reconciliation proposals ——

export const RECONCILIATION_PROPOSAL_TYPES = [
  "new-pain-point",
  "update-pain-point",
  "new-evidence-link",
] as const;

export type ReconciliationProposal = {
  id: string;
  researchRunId: string;
  proposalType: string;
  painPointId?: string | null;
  proposedData: Record<string, unknown>;
  status: string;
  reviewedByUserId?: string | null;
  reviewedAtUtc?: string | null;
  createdAtUtc: string;
};

export function listReconciliationProposals(researchRunId: string) {
  return geekApiFetch<ReconciliationProposal[]>(
    `/api/gcw/reconciliation?researchRunId=${encodeURIComponent(researchRunId)}`,
  );
}

export function getReconciliationProposal(id: string) {
  return geekApiFetch<ReconciliationProposal>(`/api/gcw/reconciliation/${id}`);
}

export function createReconciliationProposal(body: {
  researchRunId: string;
  proposalType: string;
  proposedData?: Record<string, unknown>;
  painPointId?: string | null;
}) {
  return geekApiFetch<ReconciliationProposal>("/api/gcw/reconciliation", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function approveReconciliationProposal(id: string) {
  return geekApiFetch<ReconciliationProposal>(
    `/api/gcw/reconciliation/${id}/approve`,
    { method: "PATCH" },
  );
}

export function dismissReconciliationProposal(id: string) {
  return geekApiFetch<ReconciliationProposal>(
    `/api/gcw/reconciliation/${id}/dismiss`,
    { method: "PATCH" },
  );
}

// —— Assets / drafts / reviews ——

export const ASSET_TYPES = ["pillar", "companion"] as const;
export const ASSET_STATUSES = [
  "draft",
  "readyForApproval",
  "approved",
  "published",
] as const;
export const APPROVAL_ACTIONS = [
  "submitted",
  "approved",
  "rejected",
  "changes-requested",
] as const;

export type ContentAsset = {
  id: string;
  campaignId: string;
  type: string;
  name: string;
  status: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ContentAssetVersion = {
  id: string;
  assetId: string;
  versionNumber: number;
  bodyDocumentJson: string;
  rowVersion: number;
  createdAtUtc: string;
};

export type ReviewComment = {
  id: string;
  assetVersionId: string;
  userId: string;
  sectionPath?: string | null;
  content: string;
  resolution?: string | null;
  createdAtUtc: string;
};

export type ApprovalEvent = {
  id: string;
  assetVersionId: string;
  userId: string;
  action: string;
  notes?: string | null;
  createdAtUtc: string;
};

export function listAssets(campaignId: string) {
  return geekApiFetch<ContentAsset[]>(
    `/api/gcw/assets?campaignId=${encodeURIComponent(campaignId)}`,
  );
}

export function getAsset(id: string) {
  return geekApiFetch<ContentAsset>(`/api/gcw/assets/${id}`);
}

export function createAsset(body: {
  campaignId: string;
  type: string;
  name: string;
}) {
  return geekApiFetch<ContentAsset>("/api/gcw/assets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAssetStatus(id: string, status: string) {
  return geekApiFetch<ContentAsset>(`/api/gcw/assets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAssetVersions(assetId: string) {
  return geekApiFetch<ContentAssetVersion[]>(
    `/api/gcw/asset-versions?assetId=${encodeURIComponent(assetId)}`,
  );
}

export function getAssetVersion(id: string) {
  return geekApiFetch<ContentAssetVersion>(`/api/gcw/asset-versions/${id}`);
}

export function createAssetVersion(body: {
  assetId: string;
  bodyDocumentJson: string;
}) {
  return geekApiFetch<ContentAssetVersion>("/api/gcw/asset-versions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAssetVersion(id: string, bodyDocumentJson: string) {
  return geekApiFetch<ContentAssetVersion>(`/api/gcw/asset-versions/${id}`, {
    method: "PUT",
    body: JSON.stringify({ bodyDocumentJson }),
  });
}

export function listReviewComments(assetVersionId: string) {
  return geekApiFetch<ReviewComment[]>(
    `/api/gcw/review-comments?assetVersionId=${encodeURIComponent(assetVersionId)}`,
  );
}

export function createReviewComment(body: {
  assetVersionId: string;
  content: string;
  sectionPath?: string | null;
}) {
  return geekApiFetch<ReviewComment>("/api/gcw/review-comments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resolveReviewComment(id: string, resolution: string) {
  return geekApiFetch<ReviewComment>(`/api/gcw/review-comments/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolution }),
  });
}

export function listApprovalEvents(assetVersionId: string) {
  return geekApiFetch<ApprovalEvent[]>(
    `/api/gcw/approval-events?assetVersionId=${encodeURIComponent(assetVersionId)}`,
  );
}

export function createApprovalEvent(body: {
  assetVersionId: string;
  action: string;
  notes?: string | null;
}) {
  return geekApiFetch<ApprovalEvent>("/api/gcw/approval-events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// —— Publications ——

export const PUBLICATION_STATUSES = ["draft", "published", "failed"] as const;

export type Publication = {
  id: string;
  assetVersionId: string;
  status: string;
  responseSnapshot?: Record<string, unknown> | null;
  error?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type PublicationEvent = {
  id: string;
  publicationId: string;
  userId: string;
  status: string;
  details?: string | null;
  createdAtUtc: string;
};

export function listPublications(assetVersionId: string) {
  return geekApiFetch<Publication[]>(
    `/api/gcw/publications?assetVersionId=${encodeURIComponent(assetVersionId)}`,
  );
}

export function getPublication(id: string) {
  return geekApiFetch<Publication>(`/api/gcw/publications/${id}`);
}

export function createPublication(body: { assetVersionId: string }) {
  return geekApiFetch<Publication>("/api/gcw/publications", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePublicationStatus(id: string, status: string) {
  return geekApiFetch<Publication>(`/api/gcw/publications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listPublicationEvents(publicationId: string) {
  return geekApiFetch<PublicationEvent[]>(
    `/api/gcw/publication-events?publicationId=${encodeURIComponent(publicationId)}`,
  );
}

export function createPublicationEvent(body: {
  publicationId: string;
  status: string;
  details?: string | null;
}) {
  return geekApiFetch<PublicationEvent>("/api/gcw/publication-events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
