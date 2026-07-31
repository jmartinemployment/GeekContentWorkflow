import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createResearchRun,
  listCampaigns,
  listClients,
  listResearchRuns,
  type GcwCampaign,
  type ResearchRun,
} from "@/lib/geek-api";

async function createRunAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const keyword = String(formData.get("keyword") || "").trim();
  const maxBudgetRaw = String(formData.get("maxBudget") || "10").trim();
  if (!clientId || !campaignId || !keyword) return;

  const maxBudget = Number(maxBudgetRaw);
  const run = await createResearchRun({
    campaignId,
    keyword,
    maxBudget: Number.isFinite(maxBudget) ? maxBudget : 10,
  });
  revalidatePath("/app/research");
  redirect(`/app/research/${run.id}?clientId=${clientId}`);
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; campaignId?: string }>;
}) {
  const { clientId: filterClientId, campaignId: filterCampaignId } =
    await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let campaigns: GcwCampaign[] = [];
  let runs: ResearchRun[] = [];
  let error: string | null = null;

  try {
    clients = await listClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      campaigns = await listCampaigns(clientId);
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
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load research";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const selectedCampaignId =
    filterCampaignId ||
    (campaigns.length === 1 ? campaigns[0]?.id : "") ||
    "";
  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Research
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Research runs
      </h1>
      <p className="mt-2 text-gcw-muted">
        Start a run for a campaign keyword, add sources, then capture and approve
        evidence. Reconciliation comes next.
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
              {c.name} · {c.keyword}
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

      {selectedCampaignId ? (
        <form
          action={createRunAction}
          className="mt-8 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="font-heading text-lg font-medium sm:col-span-2">
            New research run
          </h2>
          <input type="hidden" name="clientId" value={selectedClientId} />
          <input type="hidden" name="campaignId" value={selectedCampaignId} />
          <input
            name="keyword"
            required
            defaultValue={selectedCampaign?.keyword || ""}
            placeholder="Keyword"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <input
            name="maxBudget"
            type="number"
            min={1}
            step="0.01"
            defaultValue={10}
            placeholder="Max budget"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
          >
            Start run
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a campaign (create one on{" "}
          <Link
            href="/app/strategy-map"
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Strategy Map
          </Link>
          ).
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {runs.map((run) => (
          <li key={run.id}>
            <Link
              href={`/app/research/${run.id}?clientId=${selectedClientId}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-gcw-line bg-white px-4 py-3 hover:border-gcw-ink/20"
            >
              <div>
                <p className="font-medium">{run.keyword}</p>
                <p className="mt-1 text-xs text-gcw-zinc">
                  {run.status} · sources {run.discoveredSourceCount} · budget{" "}
                  {run.spentBudget}/{run.maxBudget}
                </p>
              </div>
              <span className="text-sm">→</span>
            </Link>
          </li>
        ))}
        {selectedCampaignId && runs.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No research runs yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
