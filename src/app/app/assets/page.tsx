import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ASSET_TYPES,
  createAsset,
  listAssets,
  listAllClients,
  listCampaigns,
  type ContentAsset,
  type GcwCampaign,
} from "@/lib/geek-api";

async function createAssetAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const name = String(formData.get("name") || "").trim();
  const type = String(formData.get("type") || "").trim();
  if (!clientId || !campaignId || !name || !type) return;

  const asset = await createAsset({ campaignId, name, type });
  revalidatePath("/app/assets");
  redirect(`/app/assets/${asset.id}?clientId=${clientId}`);
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; campaignId?: string }>;
}) {
  const { clientId: filterClientId, campaignId: filterCampaignId } =
    await searchParams;

  let clients: { id: string; name: string }[] = [];
  let campaigns: GcwCampaign[] = [];
  let assets: ContentAsset[] = [];
  let error: string | null = null;

  try {
    clients = await listAllClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      campaigns = await listCampaigns(clientId);
    }
    const campaignId =
      filterCampaignId ||
      (campaigns.length === 1 ? campaigns[0].id : "");
    if (campaignId) {
      assets = await listAssets(campaignId);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load assets";
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
        Creation
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Assets
      </h1>
      <p className="mt-2 text-gcw-muted">
        Pillar and companion drafts per campaign — versions, review comments, and
        approval events.
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
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      {selectedCampaignId ? (
        <form
          action={createAssetAction}
          className="mt-8 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
        >
          <h2 className="font-heading text-lg font-medium sm:col-span-2">
            New asset
          </h2>
          <input type="hidden" name="clientId" value={selectedClientId} />
          <input type="hidden" name="campaignId" value={selectedCampaignId} />
          <input
            name="name"
            required
            placeholder="Asset name"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          />
          <select
            name="type"
            required
            defaultValue="pillar"
            className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
          >
            Create asset
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a campaign from{" "}
          <Link
            href="/app/strategy-map"
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Strategy Map
          </Link>
          .
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {assets.map((a) => (
          <li key={a.id}>
            <Link
              href={`/app/assets/${a.id}?clientId=${selectedClientId}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-gcw-line bg-white px-4 py-3 hover:border-gcw-ink/20"
            >
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="mt-1 text-xs text-gcw-zinc">
                  {a.type} · {a.status}
                </p>
              </div>
              <span className="text-sm">→</span>
            </Link>
          </li>
        ))}
        {selectedCampaignId && assets.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">No assets yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
