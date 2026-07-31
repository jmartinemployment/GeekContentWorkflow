import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  BUYING_STAGES,
  approveStrategyBrief,
  getCampaign,
  getPainPoint,
  getStrategyBrief,
  rejectStrategyBrief,
  updateStrategyBrief,
} from "@/lib/geek-api";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

async function updateBriefAction(formData: FormData) {
  "use server";
  const id = String(formData.get("briefId") || "");
  const audienceProfile = String(formData.get("audienceProfile") || "").trim();
  const buyingStage = String(formData.get("buyingStage") || "").trim();
  const angle = String(formData.get("angle") || "").trim();
  const callToAction = String(formData.get("callToAction") || "").trim();
  if (!id || !audienceProfile || !buyingStage || !angle || !callToAction) return;

  await updateStrategyBrief(id, {
    audienceProfile,
    buyingStage,
    angle,
    callToAction,
  });
  revalidatePath(`/app/strategy-briefs/${id}`);
}

async function approveAction(formData: FormData) {
  "use server";
  const id = String(formData.get("briefId") || "");
  if (!id) return;
  await approveStrategyBrief(id);
  revalidatePath(`/app/strategy-briefs/${id}`);
  revalidatePath("/app/strategy-briefs");
}

async function rejectAction(formData: FormData) {
  "use server";
  const id = String(formData.get("briefId") || "");
  if (!id) return;
  await rejectStrategyBrief(id);
  revalidatePath(`/app/strategy-briefs/${id}`);
  revalidatePath("/app/strategy-briefs");
}

export default async function StrategyBriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let brief: Awaited<ReturnType<typeof getStrategyBrief>> | null = null;
  let campaignName: string | null = null;
  let painPointName: string | null = null;
  let error: string | null = null;

  try {
    brief = await getStrategyBrief(id);
    try {
      const campaign = await getCampaign(brief.campaignId);
      campaignName = campaign.name;
    } catch {
      campaignName = null;
    }
    if (brief.painPointId && brief.painPointId !== EMPTY_GUID) {
      try {
        const pp = await getPainPoint(brief.painPointId);
        painPointName = pp.name;
      } catch {
        painPointName = null;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load brief";
  }

  if (!brief) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <p className="text-sm text-gcw-muted">{error || "Brief not found"}</p>
        <Link href="/app/strategy-briefs" className="mt-4 inline-block text-sm underline">
          ← Strategy Briefs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href={`/app/strategy-briefs?campaignId=${brief.campaignId}`}
        className="text-xs font-medium text-gcw-zinc hover:text-gcw-ink"
      >
        ← Strategy Briefs
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {brief.angle || "Strategy brief"}
          </h1>
          <p className="mt-2 text-sm text-gcw-muted">
            {campaignName ? `${campaignName} · ` : null}
            Status: <span className="capitalize">{brief.status}</span>
          </p>
          <p className="mt-1 text-sm text-gcw-muted">
            Pain point:{" "}
            {painPointName ? (
              <span className="text-gcw-ink">{painPointName}</span>
            ) : brief.painPointId && brief.painPointId !== EMPTY_GUID ? (
              <code className="text-xs">{brief.painPointId}</code>
            ) : (
              <span className="text-gcw-zinc">None linked</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={approveAction}>
            <input type="hidden" name="briefId" value={brief.id} />
            <button
              type="submit"
              disabled={brief.status === "approved"}
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Approve
            </button>
          </form>
          <form action={rejectAction}>
            <input type="hidden" name="briefId" value={brief.id} />
            <button
              type="submit"
              disabled={brief.status === "rejected"}
              className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface disabled:opacity-40"
            >
              Return to research
            </button>
          </form>
        </div>
      </div>

      <form
        action={updateBriefAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <input type="hidden" name="briefId" value={brief.id} />
        <label className="block text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
          Audience profile
        </label>
        <textarea
          name="audienceProfile"
          required
          rows={3}
          defaultValue={brief.audienceProfile}
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <label className="block text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
          Buying stage
        </label>
        <select
          name="buyingStage"
          required
          defaultValue={brief.buyingStage}
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        >
          {BUYING_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
          {!BUYING_STAGES.includes(
            brief.buyingStage as (typeof BUYING_STAGES)[number],
          ) ? (
            <option value={brief.buyingStage}>{brief.buyingStage}</option>
          ) : null}
        </select>
        <label className="block text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
          Content angle
        </label>
        <input
          name="angle"
          required
          defaultValue={brief.angle}
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <label className="block text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
          Call to action
        </label>
        <input
          name="callToAction"
          required
          defaultValue={brief.callToAction}
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
