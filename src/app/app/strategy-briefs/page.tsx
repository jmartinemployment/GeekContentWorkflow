import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BUYING_STAGES,
  createCampaign,
  createStrategyBrief,
  listCampaigns,
  listClients,
  listStrategyBriefs,
  type GcwCampaign,
  type StrategyBrief,
} from "@/lib/geek-api";

async function createCampaignAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const name = String(formData.get("name") || "").trim();
  const keyword = String(formData.get("keyword") || "").trim();
  if (!clientId || !name || !keyword) return;

  const campaign = await createCampaign({ clientId, name, keyword });
  revalidatePath("/app/strategy-briefs");
  redirect(`/app/strategy-briefs?campaignId=${campaign.id}&clientId=${clientId}`);
}

async function createBriefAction(formData: FormData) {
  "use server";
  const campaignId = String(formData.get("campaignId") || "");
  const audienceProfile = String(formData.get("audienceProfile") || "").trim();
  const buyingStage = String(formData.get("buyingStage") || "").trim();
  const angle = String(formData.get("angle") || "").trim();
  const callToAction = String(formData.get("callToAction") || "").trim();
  if (!campaignId || !audienceProfile || !buyingStage || !angle || !callToAction) {
    return;
  }

  const brief = await createStrategyBrief({
    campaignId,
    audienceProfile,
    buyingStage,
    angle,
    callToAction,
  });
  revalidatePath("/app/strategy-briefs");
  redirect(`/app/strategy-briefs/${brief.id}`);
}

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-800";
    case "rejected":
      return "bg-amber-50 text-amber-900";
    default:
      return "bg-gcw-surface text-gcw-muted";
  }
}

export default async function StrategyBriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; campaignId?: string }>;
}) {
  const { clientId: filterClientId, campaignId: filterCampaignId } =
    await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let campaigns: GcwCampaign[] = [];
  let briefs: StrategyBrief[] = [];
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
      briefs = await listStrategyBriefs(campaignId);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load strategy briefs";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const selectedCampaignId =
    filterCampaignId ||
    (campaigns.length === 1 ? campaigns[0]?.id : "") ||
    "";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Strategy
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Strategy Briefs
      </h1>
      <p className="mt-2 text-gcw-muted">
        Audience, buying stage, angle, and CTA — draft → approved / rejected.
        Scoped to a campaign (pain points link later).
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

      {selectedClientId ? (
        <form
          action={createCampaignAction}
          className="mt-8 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="font-heading text-lg font-medium sm:col-span-2">
            New campaign
          </h2>
          <input type="hidden" name="clientId" value={selectedClientId} />
          <input
            name="name"
            required
            placeholder="Campaign name"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <input
            name="keyword"
            required
            placeholder="Primary keyword"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
          >
            Create campaign
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a client (or create one under Brand Core) to add campaigns.
        </p>
      )}

      {selectedCampaignId ? (
        <form
          action={createBriefAction}
          className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
        >
          <h2 className="font-heading text-lg font-medium">New strategy brief</h2>
          <input type="hidden" name="campaignId" value={selectedCampaignId} />
          <textarea
            name="audienceProfile"
            required
            rows={2}
            placeholder="Audience profile"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <select
            name="buyingStage"
            required
            defaultValue="awareness"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          >
            {BUYING_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <input
            name="angle"
            required
            placeholder="Content angle"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <input
            name="callToAction"
            required
            placeholder="Call to action"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Create brief
          </button>
        </form>
      ) : null}

      <ul className="mt-8 space-y-3">
        {briefs.map((brief) => (
          <li key={brief.id}>
            <Link
              href={`/app/strategy-briefs/${brief.id}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-gcw-line bg-white px-4 py-3 hover:border-gcw-ink/20"
            >
              <div>
                <p className="font-medium">{brief.angle || "Untitled brief"}</p>
                <p className="mt-1 text-xs text-gcw-zinc">
                  {brief.buyingStage} · {brief.audienceProfile}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(brief.status)}`}
              >
                {brief.status}
              </span>
            </Link>
          </li>
        ))}
        {selectedCampaignId && briefs.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No briefs yet for this campaign.</li>
        ) : null}
        {!selectedCampaignId && !error ? (
          <li className="text-sm text-gcw-muted">
            Choose a campaign to list briefs.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
