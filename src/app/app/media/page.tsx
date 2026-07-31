import Link from "next/link";
import {
  listAllClients,
  listAssets,
  listAssetVersions,
  listCampaigns,
  type ContentAsset,
  type GcwCampaign,
} from "@/lib/geek-api";
import { ContentDocumentExcerpt } from "@/components/app/ContentDocumentPreview";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; campaignId?: string }>;
}) {
  const { clientId: filterClientId, campaignId: filterCampaignId } =
    await searchParams;

  let clients: { id: string; name: string }[] = [];
  let campaigns: GcwCampaign[] = [];
  let visuals: { asset: ContentAsset; versionId: string; body: string }[] = [];
  let error: string | null = null;

  try {
    clients = await listAllClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) campaigns = await listCampaigns(clientId);
    const campaignId =
      filterCampaignId ||
      (campaigns.length === 1 ? campaigns[0].id : "");
    if (campaignId) {
      const assets = await listAssets(campaignId);
      const visualAssets = assets.filter((a) =>
        a.name.toLowerCase().startsWith("visual ·"),
      );
      const rows = await Promise.all(
        visualAssets.map(async (asset) => {
          const versions = await listAssetVersions(asset.id).catch(() => []);
          const latest = [...versions].sort(
            (a, b) => b.versionNumber - a.versionNumber,
          )[0];
          return latest
            ? {
                asset,
                versionId: latest.id,
                body: latest.bodyDocumentJson,
              }
            : null;
        }),
      );
      visuals = rows.filter(Boolean) as typeof visuals;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load media";
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
        Media library
      </h1>
      <p className="mt-2 text-gcw-muted">
        Visuals generated from drafts via image-generator. Open any item to see
        the full image and download it.
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
            href={`/app/media?clientId=${c.id}`}
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
              href={`/app/media?clientId=${selectedClientId}&campaignId=${c.id}`}
              className={
                c.id === selectedCampaignId
                  ? "font-medium text-gcw-ink underline"
                  : "text-gcw-muted hover:text-gcw-ink"
              }
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {selectedCampaignId ? (
        <ul className="mt-10 space-y-4">
          {visuals.map(({ asset, versionId, body }) => (
            <li key={asset.id}>
              <Link
                href={`/app/assets/${asset.id}?clientId=${selectedClientId}&versionId=${versionId}`}
                className="block rounded-2xl border border-gcw-line bg-white p-5 hover:border-gcw-ink/30"
              >
                <p className="font-heading text-base font-medium">{asset.name}</p>
                <p className="mt-2 text-sm">
                  <ContentDocumentExcerpt bodyDocumentJson={body} />
                </p>
              </Link>
            </li>
          ))}
          {visuals.length === 0 ? (
            <li className="text-sm text-gcw-muted">
              No visuals yet. Open a draft asset and use{" "}
              <span className="font-medium text-gcw-ink">Generate visual</span>.
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-8 text-sm text-gcw-muted">Select a client and campaign.</p>
      )}
    </div>
  );
}
