import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BUYING_STAGES,
  approveStrategyBrief,
  createAsset,
  generateDraftFromBrief,
  getCampaign,
  getPainPoint,
  getStrategyBrief,
  listAssets,
  listDraftTemplates,
  listTonePresets,
  rejectStrategyBrief,
  updateStrategyBrief,
  type ContentAsset,
  type DraftTemplate,
  type TonePreset,
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

async function generateDraftAction(formData: FormData) {
  "use server";
  const briefId = String(formData.get("briefId") || "");
  const clientId = String(formData.get("clientId") || "");
  let assetId = String(formData.get("assetId") || "").trim();
  const createNew = String(formData.get("createNew") || "") === "1";
  const campaignId = String(formData.get("campaignId") || "");
  const assetName = String(formData.get("assetName") || "").trim();
  const provider = String(formData.get("provider") || "OpenAi").trim();
  const templateSlug = String(formData.get("templateSlug") || "").trim();
  const tone = String(formData.get("tone") || "").trim();

  if (!briefId || !clientId || !campaignId) return;

  try {
    if (createNew || !assetId) {
      const name = assetName || "Generated pillar draft";
      const asset = await createAsset({
        campaignId,
        name,
        type: "pillar",
      });
      assetId = asset.id;
    }

    const version = await generateDraftFromBrief(briefId, {
      assetId,
      provider,
      ...(templateSlug ? { templateSlug } : {}),
      ...(tone ? { tone } : {}),
    });
    revalidatePath(`/app/strategy-briefs/${briefId}`);
    revalidatePath(`/app/assets/${assetId}`);
    redirect(
      `/app/assets/${assetId}?clientId=${clientId}&versionId=${version.id}`,
    );
  } catch (e) {
    if (
      typeof e === "object" &&
      e &&
      "digest" in e &&
      String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    const msg =
      e instanceof Error ? e.message : "Draft generation failed";
    redirect(
      `/app/strategy-briefs/${briefId}?error=${encodeURIComponent(msg)}`,
    );
  }
}

export default async function StrategyBriefDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: queryError } = await searchParams;
  let brief: Awaited<ReturnType<typeof getStrategyBrief>> | null = null;
  let campaignName: string | null = null;
  let clientId = "";
  let painPointName: string | null = null;
  let assets: ContentAsset[] = [];
  let templates: DraftTemplate[] = [];
  let tones: TonePreset[] = [];
  let error: string | null = queryError || null;

  try {
    brief = await getStrategyBrief(id);
    try {
      const campaign = await getCampaign(brief.campaignId);
      campaignName = campaign.name;
      clientId = campaign.clientId;
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
    [assets, templates, tones] = await Promise.all([
      listAssets(brief.campaignId).catch(() => [] as ContentAsset[]),
      listDraftTemplates().catch(() => [] as DraftTemplate[]),
      listTonePresets().catch(() => [] as TonePreset[]),
    ]);
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

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

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

      <form
        action={generateDraftAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <h2 className="font-heading text-lg font-medium">
          Generate brand-grounded draft
        </h2>
        <p className="text-sm text-gcw-muted">
          Uses this brief, linked evidence, and Brand Core facts/voice when the
          campaign has a profile version. Saves a new structured asset version.
        </p>
        <input type="hidden" name="briefId" value={brief.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="campaignId" value={brief.campaignId} />

        {assets.length > 0 ? (
          <label className="block text-sm">
            <span className="mb-1 block text-gcw-muted">Existing asset</span>
            <select
              name="assetId"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              defaultValue={assets[0]?.id}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="createNew"
            value="1"
            defaultChecked={assets.length === 0}
          />
          Create new pillar asset
        </label>
        <input
          name="assetName"
          placeholder="New asset name (if creating)"
          defaultValue={`${brief.angle.slice(0, 48)} draft`}
          className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
        />
        <label className="block text-sm">
          <span className="mb-1 block text-gcw-muted">Template</span>
          <select
            name="templateSlug"
            defaultValue="blog-pillar"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} — {t.description}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gcw-muted">Tone</span>
          <select
            name="tone"
            defaultValue="professional"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          >
            {tones.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} — {t.description}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gcw-muted">Provider</span>
          <select
            name="provider"
            defaultValue="OpenAi"
            className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
          >
            <option value="OpenAi">OpenAI</option>
            <option value="Anthropic">Anthropic</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Generate draft
        </button>
      </form>
    </div>
  );
}
