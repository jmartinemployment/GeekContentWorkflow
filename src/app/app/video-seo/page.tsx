import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateVideoSeoPack,
  listAllClients,
  listAssets,
  listAssetVersions,
  listCampaigns,
  listTonePresets,
  type ContentAsset,
  type GcwCampaign,
  type TonePreset,
} from "@/lib/geek-api";

async function videoSeoAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const versionId = String(formData.get("versionId") || "");
  const provider = String(formData.get("provider") || "OpenAi").trim();
  const tone = String(formData.get("tone") || "").trim();
  if (!clientId || !campaignId || !versionId) return;

  try {
    const result = await generateVideoSeoPack(versionId, {
      provider,
      ...(tone ? { tone } : {}),
    });
    revalidatePath("/app/assets");
    revalidatePath("/app/video-seo");
    redirect(
      `/app/assets?clientId=${clientId}&campaignId=${result.campaignId}&videoSeo=${result.created.length}`,
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
    const msg = e instanceof Error ? e.message : "Video SEO pack failed";
    redirect(
      `/app/video-seo?clientId=${clientId}&campaignId=${campaignId}&error=${encodeURIComponent(msg)}`,
    );
  }
}

export default async function VideoSeoPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    campaignId?: string;
    error?: string;
  }>;
}) {
  const {
    clientId: filterClientId,
    campaignId: filterCampaignId,
    error: queryError,
  } = await searchParams;

  let clients: { id: string; name: string }[] = [];
  let campaigns: GcwCampaign[] = [];
  let pillars: ContentAsset[] = [];
  let tones: TonePreset[] = [];
  let latestByAsset: Record<string, string> = {};
  let error: string | null = queryError || null;

  try {
    [clients, tones] = await Promise.all([
      listAllClients(),
      listTonePresets().catch(() => [] as TonePreset[]),
    ]);
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      campaigns = await listCampaigns(clientId);
    }
    const campaignId =
      filterCampaignId ||
      (campaigns.length === 1 ? campaigns[0].id : "");
    if (campaignId) {
      const assets = await listAssets(campaignId);
      pillars = assets.filter((a) => a.type === "pillar");
      const versionLists = await Promise.all(
        pillars.map(async (a) => {
          const versions = await listAssetVersions(a.id).catch(() => []);
          const latest = [...versions].sort(
            (x, y) => y.versionNumber - x.versionNumber,
          )[0];
          return [a.id, latest?.id ?? ""] as const;
        }),
      );
      latestByAsset = Object.fromEntries(versionLists);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load video SEO";
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
        Media
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Video SEO
      </h1>
      <p className="mt-2 text-gcw-muted">
        Turn a pillar into a YouTube publish pack: titles, description, tags,
        chapters, thumbnail concepts, and Shorts hooks — each as companion
        assets.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/app/video-seo?clientId=${c.id}`}
            className={
              c.id === selectedClientId
                ? "font-medium text-gcw-ink underline"
                : "text-gcw-muted hover:text-gcw-ink"
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      {selectedClientId ? (
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/app/video-seo?clientId=${selectedClientId}&campaignId=${c.id}`}
              className={
                c.id === selectedCampaignId
                  ? "font-medium text-gcw-ink underline"
                  : "text-gcw-muted hover:text-gcw-ink"
              }
            >
              {c.name}
            </Link>
          ))}
          {campaigns.length === 0 ? (
            <p className="text-gcw-muted">No campaigns for this client.</p>
          ) : null}
        </div>
      ) : null}

      {selectedCampaignId ? (
        <div className="mt-10 space-y-4">
          <h2 className="font-heading text-lg font-medium">Pillar drafts</h2>
          {pillars.length === 0 ? (
            <p className="text-sm text-gcw-muted">
              No pillar assets yet.{" "}
              <Link
                href={`/app/strategy-briefs?clientId=${selectedClientId}`}
                className="underline"
              >
                Generate from a strategy brief
              </Link>
              .
            </p>
          ) : (
            pillars.map((pillar) => {
              const versionId = latestByAsset[pillar.id];
              if (!versionId) {
                return (
                  <div
                    key={pillar.id}
                    className="rounded-2xl border border-gcw-line bg-white p-5 text-sm text-gcw-muted"
                  >
                    {pillar.name} — no versions yet
                  </div>
                );
              }
              return (
                <form
                  key={pillar.id}
                  action={videoSeoAction}
                  className="space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-heading text-base font-medium">
                      {pillar.name}
                    </h3>
                    <Link
                      href={`/app/assets/${pillar.id}?clientId=${selectedClientId}`}
                      className="text-xs text-gcw-zinc underline"
                    >
                      Open asset
                    </Link>
                  </div>
                  <input type="hidden" name="clientId" value={selectedClientId} />
                  <input
                    type="hidden"
                    name="campaignId"
                    value={selectedCampaignId}
                  />
                  <input type="hidden" name="versionId" value={versionId} />
                  <select
                    name="tone"
                    defaultValue="professional"
                    className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  >
                    {tones.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="provider"
                    defaultValue="OpenAi"
                    className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  >
                    <option value="OpenAi">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
                  >
                    Generate video SEO pack
                  </button>
                </form>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
