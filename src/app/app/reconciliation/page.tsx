import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  RECONCILIATION_PROPOSAL_TYPES,
  approveReconciliationProposal,
  createReconciliationProposal,
  dismissReconciliationProposal,
  listCampaigns,
  listClients,
  listPainPoints,
  listReconciliationProposals,
  listResearchRuns,
  type GcwCampaign,
  type PainPoint,
  type ReconciliationProposal,
  type ResearchRun,
} from "@/lib/geek-api";

async function createProposalAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const researchRunId = String(formData.get("researchRunId") || "");
  const proposalType = String(formData.get("proposalType") || "").trim();
  const painPointId = String(formData.get("painPointId") || "").trim() || null;
  const proposedDataRaw = String(formData.get("proposedData") || "").trim();
  if (!clientId || !campaignId || !researchRunId || !proposalType) return;

  let proposedData: Record<string, unknown> = {};
  try {
    proposedData = proposedDataRaw
      ? (JSON.parse(proposedDataRaw) as Record<string, unknown>)
      : {};
  } catch {
    redirect(
      `/app/reconciliation?clientId=${clientId}&campaignId=${campaignId}&researchRunId=${researchRunId}&error=${encodeURIComponent("Proposed data must be valid JSON")}`,
    );
  }

  if (
    typeof proposedData !== "object" ||
    proposedData === null ||
    Array.isArray(proposedData)
  ) {
    redirect(
      `/app/reconciliation?clientId=${clientId}&campaignId=${campaignId}&researchRunId=${researchRunId}&error=${encodeURIComponent("Proposed data must be a JSON object")}`,
    );
  }

  await createReconciliationProposal({
    researchRunId,
    proposalType,
    proposedData,
    painPointId,
  });
  revalidatePath("/app/reconciliation");
  redirect(
    `/app/reconciliation?clientId=${clientId}&campaignId=${campaignId}&researchRunId=${researchRunId}`,
  );
}

async function approveAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const researchRunId = String(formData.get("researchRunId") || "");
  const proposalId = String(formData.get("proposalId") || "");
  if (!proposalId) return;

  await approveReconciliationProposal(proposalId);
  revalidatePath("/app/reconciliation");
  redirect(
    `/app/reconciliation?clientId=${clientId}&campaignId=${campaignId}&researchRunId=${researchRunId}`,
  );
}

async function dismissAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const researchRunId = String(formData.get("researchRunId") || "");
  const proposalId = String(formData.get("proposalId") || "");
  if (!proposalId) return;

  await dismissReconciliationProposal(proposalId);
  revalidatePath("/app/reconciliation");
  redirect(
    `/app/reconciliation?clientId=${clientId}&campaignId=${campaignId}&researchRunId=${researchRunId}`,
  );
}

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    campaignId?: string;
    researchRunId?: string;
    error?: string;
  }>;
}) {
  const {
    clientId: filterClientId,
    campaignId: filterCampaignId,
    researchRunId: filterRunId,
    error: queryError,
  } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let campaigns: GcwCampaign[] = [];
  let runs: ResearchRun[] = [];
  let painPoints: PainPoint[] = [];
  let proposals: ReconciliationProposal[] = [];
  let error: string | null = queryError || null;

  try {
    clients = await listClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      [campaigns, painPoints] = await Promise.all([
        listCampaigns(clientId),
        listPainPoints(clientId),
      ]);
    }
    const campaignId =
      filterCampaignId ||
      (campaigns.length === 1 ? campaigns[0].id : "");
    if (campaignId) {
      runs = await listResearchRuns(campaignId);
      runs = [...runs].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    }
    const researchRunId =
      filterRunId || (runs.length === 1 ? runs[0].id : "");
    if (researchRunId) {
      proposals = await listReconciliationProposals(researchRunId);
      proposals = [...proposals].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load reconciliation";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const selectedCampaignId =
    filterCampaignId ||
    (campaigns.length === 1 ? campaigns[0]?.id : "") ||
    "";
  const selectedRunId =
    filterRunId || (runs.length === 1 ? runs[0]?.id : "") || "";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Research
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Reconciliation
      </h1>
      <p className="mt-2 text-gcw-muted">
        Propose new or updated pain points from a research run, then approve or
        dismiss.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <form className="mt-8 flex flex-wrap gap-3" method="get">
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
        <select
          name="campaignId"
          defaultValue={selectedCampaignId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="researchRunId"
          defaultValue={selectedRunId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select research run</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.keyword} · {r.status}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      {!selectedRunId ? (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a research run (create one under{" "}
          <Link
            href="/app/research"
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Research
          </Link>
          ).
        </p>
      ) : (
        <>
          <form
            action={createProposalAction}
            className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h2 className="font-heading text-lg font-medium">New proposal</h2>
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input type="hidden" name="campaignId" value={selectedCampaignId} />
            <input type="hidden" name="researchRunId" value={selectedRunId} />
            <select
              name="proposalType"
              required
              defaultValue="new-pain-point"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            >
              {RECONCILIATION_PROPOSAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              name="painPointId"
              defaultValue=""
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            >
              <option value="">Pain point (optional / required for update)</option>
              {painPoints.map((pp) => (
                <option key={pp.id} value={pp.id}>
                  {pp.name}
                </option>
              ))}
            </select>
            <textarea
              name="proposedData"
              rows={8}
              required
              defaultValue={`{\n  "name": "Proposed pain",\n  "description": "From research",\n  "readerSymptom": "…",\n  "costOfInaction": "…",\n  "offerTerminology": "…"\n}`}
              className="w-full rounded-lg border border-gcw-line px-3 py-2 font-mono text-xs"
            />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Create proposal
            </button>
          </form>

          <ul className="mt-8 space-y-3">
            {proposals.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-gcw-line bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.proposalType}</p>
                    <p className="mt-1 text-xs text-gcw-zinc capitalize">
                      {p.status}
                      {p.reviewedAtUtc
                        ? ` · reviewed ${new Date(p.reviewedAtUtc).toLocaleString()}`
                        : ""}
                    </p>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-gcw-surface p-2 text-xs">
                      {JSON.stringify(p.proposedData, null, 2)}
                    </pre>
                  </div>
                  {p.status === "pending" ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={approveAction}>
                        <input
                          type="hidden"
                          name="clientId"
                          value={selectedClientId}
                        />
                        <input
                          type="hidden"
                          name="campaignId"
                          value={selectedCampaignId}
                        />
                        <input
                          type="hidden"
                          name="researchRunId"
                          value={selectedRunId}
                        />
                        <input type="hidden" name="proposalId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-pill bg-gcw-ink px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={dismissAction}>
                        <input
                          type="hidden"
                          name="clientId"
                          value={selectedClientId}
                        />
                        <input
                          type="hidden"
                          name="campaignId"
                          value={selectedCampaignId}
                        />
                        <input
                          type="hidden"
                          name="researchRunId"
                          value={selectedRunId}
                        />
                        <input type="hidden" name="proposalId" value={p.id} />
                        <button
                          type="submit"
                          className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                        >
                          Dismiss
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
            {proposals.length === 0 ? (
              <li className="text-sm text-gcw-muted">No proposals yet.</li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}
