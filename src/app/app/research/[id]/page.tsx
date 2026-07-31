import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  EVIDENCE_SUPPORT_LEVELS,
  RESEARCH_SOURCE_TYPES,
  approveResearchEvidence,
  createResearchEvidence,
  createResearchSource,
  getCampaign,
  getResearchRun,
  listResearchEvidence,
  listResearchSources,
  updateResearchRunStatus,
  type ResearchEvidence,
  type ResearchSource,
} from "@/lib/geek-api";

async function updateStatusAction(formData: FormData) {
  "use server";
  const runId = String(formData.get("runId") || "");
  const clientId = String(formData.get("clientId") || "");
  const status = String(formData.get("status") || "").trim();
  const discoveredRaw = String(formData.get("discoveredSourceCount") || "");
  if (!runId || !status) return;

  await updateResearchRunStatus(runId, {
    status,
    discoveredSourceCount: discoveredRaw
      ? Number(discoveredRaw)
      : undefined,
  });
  revalidatePath(`/app/research/${runId}`);
  redirect(`/app/research/${runId}?clientId=${clientId}`);
}

async function createSourceAction(formData: FormData) {
  "use server";
  const runId = String(formData.get("runId") || "");
  const clientId = String(formData.get("clientId") || "");
  const sourceType = String(formData.get("sourceType") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const url = String(formData.get("url") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  if (!runId || !sourceType || !title) return;

  await createResearchSource({
    researchRunId: runId,
    sourceType,
    title,
    url,
    description,
  });

  const sources = await listResearchSources(runId);
  await updateResearchRunStatus(runId, {
    status: "running",
    discoveredSourceCount: sources.length,
  });

  revalidatePath(`/app/research/${runId}`);
  redirect(`/app/research/${runId}?clientId=${clientId}`);
}

async function createEvidenceAction(formData: FormData) {
  "use server";
  const runId = String(formData.get("runId") || "");
  const clientId = String(formData.get("clientId") || "");
  const researchSourceId = String(formData.get("researchSourceId") || "");
  const statement = String(formData.get("statement") || "").trim();
  const supportLevel = String(formData.get("supportLevel") || "").trim();
  const confidenceRaw = String(formData.get("confidence") || "50").trim();
  if (!runId || !researchSourceId || !statement || !supportLevel) return;

  const confidence = Number(confidenceRaw);
  await createResearchEvidence({
    researchSourceId,
    statement,
    supportLevel,
    confidence: Number.isFinite(confidence) ? confidence : 50,
  });
  revalidatePath(`/app/research/${runId}`);
  redirect(`/app/research/${runId}?clientId=${clientId}`);
}

async function approveEvidenceAction(formData: FormData) {
  "use server";
  const runId = String(formData.get("runId") || "");
  const clientId = String(formData.get("clientId") || "");
  const evidenceId = String(formData.get("evidenceId") || "");
  if (!runId || !evidenceId) return;

  await approveResearchEvidence(evidenceId);
  revalidatePath(`/app/research/${runId}`);
  redirect(`/app/research/${runId}?clientId=${clientId}`);
}

async function completeRunAction(formData: FormData) {
  "use server";
  const runId = String(formData.get("runId") || "");
  const clientId = String(formData.get("clientId") || "");
  if (!runId) return;

  const sources = await listResearchSources(runId);
  await updateResearchRunStatus(runId, {
    status: "completed",
    discoveredSourceCount: sources.length,
  });
  revalidatePath(`/app/research/${runId}`);
  redirect(`/app/research/${runId}?clientId=${clientId}`);
}

export default async function ResearchRunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { id } = await params;
  const { clientId = "" } = await searchParams;

  let run: Awaited<ReturnType<typeof getResearchRun>> | null = null;
  let campaignName: string | null = null;
  let sources: ResearchSource[] = [];
  let evidenceBySource = new Map<string, ResearchEvidence[]>();
  let error: string | null = null;

  try {
    run = await getResearchRun(id);
    try {
      const campaign = await getCampaign(run.campaignId);
      campaignName = campaign.name;
    } catch {
      campaignName = null;
    }
    sources = await listResearchSources(id);
    const pairs = await Promise.all(
      sources.map(
        async (s) => [s.id, await listResearchEvidence(s.id)] as const,
      ),
    );
    evidenceBySource = new Map(pairs);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load research run";
  }

  if (!run) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <p className="text-sm text-gcw-muted">{error || "Run not found"}</p>
        <Link href="/app/research" className="mt-4 inline-block text-sm underline">
          ← Research
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href={`/app/research?clientId=${clientId}&campaignId=${run.campaignId}`}
        className="text-xs font-medium text-gcw-zinc hover:text-gcw-ink"
      >
        ← Research runs
      </Link>

      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight">
        {run.keyword}
      </h1>
      <p className="mt-2 text-sm text-gcw-muted">
        {campaignName ? `${campaignName} · ` : null}
        Status: <span className="capitalize">{run.status}</span> · sources{" "}
        {run.discoveredSourceCount} · budget {run.spentBudget}/{run.maxBudget}
      </p>
      <p className="mt-2">
        <Link
          href={`/app/reconciliation?clientId=${clientId}&campaignId=${run.campaignId}&researchRunId=${run.id}`}
          className="text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
        >
          Reconciliation proposals →
        </Link>
      </p>

      {error ? (
        <p className="mt-4 text-sm text-amber-900">{error}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {run.status === "queued" ? (
          <form action={updateStatusAction}>
            <input type="hidden" name="runId" value={run.id} />
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="status" value="running" />
            <button
              type="submit"
              className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
            >
              Mark running
            </button>
          </form>
        ) : null}
        {run.status !== "completed" &&
        run.status !== "failed" &&
        run.status !== "completed-with-partial-coverage" ? (
          <form action={completeRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <input type="hidden" name="clientId" value={clientId} />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Mark completed
            </button>
          </form>
        ) : null}
      </div>

      <form
        action={createSourceAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <h2 className="font-heading text-lg font-medium">Add source</h2>
        <input type="hidden" name="runId" value={run.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <select
          name="sourceType"
          required
          defaultValue="OperatorUploaded"
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        >
          {RESEARCH_SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          name="title"
          required
          placeholder="Source title"
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <input
          name="url"
          placeholder="https://…"
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <textarea
          name="description"
          rows={2}
          placeholder="Description"
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Add source
        </button>
      </form>

      <div className="mt-10 space-y-6">
        <h2 className="font-heading text-lg font-medium">Sources & evidence</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-gcw-muted">No sources yet.</p>
        ) : null}
        {sources.map((source) => {
          const evidence = evidenceBySource.get(source.id) || [];
          return (
            <div
              key={source.id}
              className="rounded-2xl border border-gcw-line bg-white p-5"
            >
              <p className="font-medium">{source.title}</p>
              <p className="mt-1 text-xs text-gcw-zinc">
                {source.sourceType}
                {source.url ? ` · ${source.url}` : ""}
              </p>
              {source.description ? (
                <p className="mt-2 text-sm text-gcw-muted">{source.description}</p>
              ) : null}

              <ul className="mt-4 space-y-2">
                {evidence.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p>{ev.statement}</p>
                        <p className="mt-1 text-xs text-gcw-zinc">
                          {ev.supportLevel} · confidence {ev.confidence}
                          {ev.approvedForClaim ? " · approved" : ""}
                        </p>
                      </div>
                      {!ev.approvedForClaim ? (
                        <form action={approveEvidenceAction}>
                          <input type="hidden" name="runId" value={run.id} />
                          <input
                            type="hidden"
                            name="clientId"
                            value={clientId}
                          />
                          <input
                            type="hidden"
                            name="evidenceId"
                            value={ev.id}
                          />
                          <button
                            type="submit"
                            className="rounded-pill border border-gcw-line px-3 py-1 text-xs font-medium hover:bg-gcw-surface"
                          >
                            Approve for claim
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              <form
                action={createEvidenceAction}
                className="mt-4 space-y-2 border-t border-gcw-line pt-4"
              >
                <input type="hidden" name="runId" value={run.id} />
                <input type="hidden" name="clientId" value={clientId} />
                <input
                  type="hidden"
                  name="researchSourceId"
                  value={source.id}
                />
                <textarea
                  name="statement"
                  required
                  rows={2}
                  placeholder="Evidence statement"
                  className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    name="supportLevel"
                    required
                    defaultValue="ObservedMarketLanguage"
                    className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  >
                    {EVIDENCE_SUPPORT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  <input
                    name="confidence"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={70}
                    className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                >
                  Add evidence
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
