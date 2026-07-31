import Link from "next/link";
import {
  listAssets,
  listAllClients,
  listCampaigns,
  listKeywords,
  listPainPoints,
  listResearchRuns,
  listReconciliationProposals,
  listStrategyBriefs,
  type ContentAsset,
  type GcwCampaign,
  type KeywordCandidate,
  type PainPoint,
  type StrategyBrief,
} from "@/lib/geek-api";

type Insight = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "high" | "medium" | "low";
};

async function loadClientOptions(): Promise<{ id: string; name: string }[]> {
  return listAllClients();
}

function buildInsights(input: {
  clientId: string;
  campaigns: GcwCampaign[];
  assets: ContentAsset[];
  keywords: KeywordCandidate[];
  painPoints: PainPoint[];
  briefs: StrategyBrief[];
  pendingReconciliation: number;
}): Insight[] {
  const insights: Insight[] = [];
  const { clientId } = input;

  for (const campaign of input.campaigns) {
    if (campaign.status === "draft" || campaign.status === "research") {
      insights.push({
        id: `camp-${campaign.id}`,
        title: `Advance campaign “${campaign.name}”`,
        detail: `Still in ${campaign.status}. Move research or strategy forward.`,
        href: `/app/strategy-map?clientId=${clientId}`,
        severity: campaign.status === "draft" ? "medium" : "high",
      });
    }
  }

  const queuedKeywords = input.keywords.filter(
    (k) => k.status === "research-queued" || k.status === "draft",
  );
  if (queuedKeywords.length > 0) {
    insights.push({
      id: `kw-${clientId}`,
      title: `${queuedKeywords.length} keyword${queuedKeywords.length === 1 ? "" : "s"} waiting`,
      detail: "Queue keywords into research or brief them for a campaign.",
      href: `/app/strategy-map?clientId=${clientId}`,
      severity: "medium",
    });
  }

  if (input.painPoints.length === 0) {
    insights.push({
      id: `pp-empty-${clientId}`,
      title: "No pain points yet",
      detail: "Capture client pains so briefs and drafts stay grounded.",
      href: `/app/pain-points?clientId=${clientId}`,
      severity: "low",
    });
  }

  const draftBriefs = input.briefs.filter((b) => b.status === "draft");
  if (draftBriefs.length > 0) {
    insights.push({
      id: `brief-${clientId}`,
      title: `${draftBriefs.length} strategy brief${draftBriefs.length === 1 ? "" : "s"} awaiting approval`,
      detail: "Approve or reject drafts before drafting assets.",
      href: `/app/strategy-briefs?clientId=${clientId}`,
      severity: "high",
    });
  }

  const reviewAssets = input.assets.filter(
    (a) => a.status === "readyForApproval" || a.status === "draft",
  );
  if (reviewAssets.length > 0) {
    insights.push({
      id: `assets-${clientId}`,
      title: `${reviewAssets.length} asset${reviewAssets.length === 1 ? "" : "s"} need attention`,
      detail: "Open the review queue or advance asset status.",
      href: `/app/reviews?clientId=${clientId}`,
      severity: "high",
    });
  }

  if (input.pendingReconciliation > 0) {
    insights.push({
      id: `recon-${clientId}`,
      title: `${input.pendingReconciliation} reconciliation proposal${input.pendingReconciliation === 1 ? "" : "s"} pending`,
      detail: "Approve or dismiss research proposals before they go stale.",
      href: `/app/reconciliation?clientId=${clientId}`,
      severity: "high",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: `ok-${clientId}`,
      title: "Pipeline looks clear",
      detail: "No blocking opportunities detected for this client right now.",
      href: `/app/analytics?clientId=${clientId}`,
      severity: "low",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId: filterClientId } = await searchParams;

  let clients: { id: string; name: string }[] = [];
  let insights: Insight[] = [];
  let error: string | null = null;

  try {
    clients = await loadClientOptions();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");

    if (clientId) {
      const [campaigns, keywords, painPoints] = await Promise.all([
        listCampaigns(clientId),
        listKeywords(clientId).catch(() => [] as KeywordCandidate[]),
        listPainPoints(clientId).catch(() => [] as PainPoint[]),
      ]);

      const assetLists = await Promise.all(
        campaigns.map((c) => listAssets(c.id).catch(() => [] as ContentAsset[])),
      );
      const assets = assetLists.flat();

      const briefLists = await Promise.all(
        campaigns.map((c) =>
          listStrategyBriefs(c.id).catch(() => [] as StrategyBrief[]),
        ),
      );
      const briefs = briefLists.flat();

      const runLists = await Promise.all(
        campaigns.map((c) => listResearchRuns(c.id).catch(() => [])),
      );
      const runs = runLists.flat();
      const proposalLists = await Promise.all(
        runs.map((r) => listReconciliationProposals(r.id).catch(() => [])),
      );
      const pendingReconciliation = proposalLists
        .flat()
        .filter((p) => p.status === "pending").length;

      insights = buildInsights({
        clientId,
        campaigns,
        assets,
        keywords,
        painPoints,
        briefs,
        pendingReconciliation,
      });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load insights";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Analytics
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Insights
      </h1>
      <p className="mt-2 text-gcw-muted">
        Opportunity and recommendation surface from campaigns, research, briefs,
        and drafts — not SERP copying.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block text-gcw-muted">Client</span>
          <select
            name="clientId"
            defaultValue={selectedClientId}
            className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      <ul className="mt-8 space-y-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-2xl border border-gcw-line bg-white p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{insight.title}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gcw-zinc">
                {insight.severity}
              </p>
            </div>
            <p className="mt-2 text-sm text-gcw-muted">{insight.detail}</p>
            <p className="mt-3 text-sm">
              <Link
                href={insight.href}
                className="font-medium text-gcw-ink underline-offset-2 hover:underline"
              >
                Take action →
              </Link>
            </p>
          </li>
        ))}
        {!selectedClientId && !error ? (
          <li className="text-sm text-gcw-muted">
            Select a client to see recommendations.
          </li>
        ) : null}
      </ul>

      <p className="mt-8 text-sm">
        <Link
          href={`/app/analytics${selectedClientId ? `?clientId=${selectedClientId}` : ""}`}
          className="font-medium text-gcw-muted underline-offset-2 hover:underline"
        >
          Open status rollups →
        </Link>
      </p>
    </div>
  );
}
