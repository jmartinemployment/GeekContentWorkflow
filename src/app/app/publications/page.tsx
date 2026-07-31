import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  PUBLICATION_STATUSES,
  createPublication,
  createPublicationEvent,
  listAssets,
  listAssetVersions,
  listCampaigns,
  listClients,
  listPublicationEvents,
  listPublications,
  updateAssetStatus,
  updatePublicationStatus,
  type ContentAsset,
  type ContentAssetVersion,
  type GcwCampaign,
  type Publication,
  type PublicationEvent,
} from "@/lib/geek-api";

async function createPublicationAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const assetId = String(formData.get("assetId") || "");
  const assetVersionId = String(formData.get("assetVersionId") || "");
  if (!clientId || !campaignId || !assetVersionId) return;

  const publication = await createPublication({ assetVersionId });
  revalidatePath("/app/publications");
  redirect(
    `/app/publications?clientId=${clientId}&campaignId=${campaignId}&assetId=${assetId}&assetVersionId=${assetVersionId}&publicationId=${publication.id}`,
  );
}

async function updateStatusAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const assetId = String(formData.get("assetId") || "");
  const assetVersionId = String(formData.get("assetVersionId") || "");
  const publicationId = String(formData.get("publicationId") || "");
  const status = String(formData.get("status") || "").trim();
  if (!publicationId || !status) return;

  await updatePublicationStatus(publicationId, status);
  if (status === "published" && assetId) {
    await updateAssetStatus(assetId, "published");
  }
  await createPublicationEvent({
    publicationId,
    status,
    details: `Status set to ${status}`,
  });
  revalidatePath("/app/publications");
  redirect(
    `/app/publications?clientId=${clientId}&campaignId=${campaignId}&assetId=${assetId}&assetVersionId=${assetVersionId}&publicationId=${publicationId}`,
  );
}

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    campaignId?: string;
    assetId?: string;
    assetVersionId?: string;
    publicationId?: string;
  }>;
}) {
  const {
    clientId: filterClientId,
    campaignId: filterCampaignId,
    assetId: filterAssetId,
    assetVersionId: filterVersionId,
    publicationId: filterPublicationId,
  } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let campaigns: GcwCampaign[] = [];
  let assets: ContentAsset[] = [];
  let versions: ContentAssetVersion[] = [];
  let publications: Publication[] = [];
  let events: PublicationEvent[] = [];
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
      assets = await listAssets(campaignId);
    }
    const assetId =
      filterAssetId || (assets.length === 1 ? assets[0].id : "");
    if (assetId) {
      versions = await listAssetVersions(assetId);
      versions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    }
    const assetVersionId =
      filterVersionId || (versions.length === 1 ? versions[0].id : "");
    if (assetVersionId) {
      publications = await listPublications(assetVersionId);
      publications = [...publications].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    }
    const publicationId =
      filterPublicationId ||
      (publications.length === 1 ? publications[0].id : "");
    if (publicationId) {
      events = await listPublicationEvents(publicationId);
      events = [...events].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load publications";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const selectedCampaignId =
    filterCampaignId ||
    (campaigns.length === 1 ? campaigns[0]?.id : "") ||
    "";
  const selectedAssetId =
    filterAssetId || (assets.length === 1 ? assets[0]?.id : "") || "";
  const selectedVersionId =
    filterVersionId || (versions.length === 1 ? versions[0]?.id : "") || "";
  const selectedPublicationId =
    filterPublicationId ||
    (publications.length === 1 ? publications[0]?.id : "") ||
    "";
  const selectedPublication =
    publications.find((p) => p.id === selectedPublicationId) || null;

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Publish
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Publications
      </h1>
      <p className="mt-2 text-gcw-muted">
        Record publish attempts from asset draft versions and track status
        events.
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
          name="assetId"
          defaultValue={selectedAssetId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select asset</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.type}
            </option>
          ))}
        </select>
        <select
          name="assetVersionId"
          defaultValue={selectedVersionId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">Select version</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              v{v.versionNumber}
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

      {!selectedVersionId ? (
        <p className="mt-6 text-sm text-gcw-muted">
          Select an asset version (create drafts under{" "}
          <Link
            href="/app/assets"
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Assets
          </Link>
          ).
        </p>
      ) : (
        <>
          <form action={createPublicationAction} className="mt-8">
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input type="hidden" name="campaignId" value={selectedCampaignId} />
            <input type="hidden" name="assetId" value={selectedAssetId} />
            <input
              type="hidden"
              name="assetVersionId"
              value={selectedVersionId}
            />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Create publication attempt
            </button>
          </form>

          <ul className="mt-8 space-y-3">
            {publications.map((pub) => (
              <li
                key={pub.id}
                className={`rounded-xl border bg-white px-4 py-3 ${
                  pub.id === selectedPublicationId
                    ? "border-gcw-ink"
                    : "border-gcw-line"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium capitalize">{pub.status}</p>
                    <p className="mt-1 text-xs text-gcw-zinc">
                      {new Date(pub.createdAtUtc).toLocaleString()}
                    </p>
                    <p className="mt-1 truncate text-xs text-gcw-muted">{pub.id}</p>
                  </div>
                  <Link
                    href={`/app/publications?clientId=${selectedClientId}&campaignId=${selectedCampaignId}&assetId=${selectedAssetId}&assetVersionId=${selectedVersionId}&publicationId=${pub.id}`}
                    className="text-sm font-medium text-gcw-ink underline-offset-2 hover:underline"
                  >
                    Events →
                  </Link>
                </div>
              </li>
            ))}
            {publications.length === 0 ? (
              <li className="text-sm text-gcw-muted">No publications yet.</li>
            ) : null}
          </ul>

          {selectedPublication ? (
            <div className="mt-8 rounded-2xl border border-gcw-line bg-white p-5">
              <h2 className="font-heading text-lg font-medium">
                Update status · {selectedPublication.status}
              </h2>
              <form
                action={updateStatusAction}
                className="mt-4 flex flex-wrap gap-2"
              >
                <input type="hidden" name="clientId" value={selectedClientId} />
                <input
                  type="hidden"
                  name="campaignId"
                  value={selectedCampaignId}
                />
                <input type="hidden" name="assetId" value={selectedAssetId} />
                <input
                  type="hidden"
                  name="assetVersionId"
                  value={selectedVersionId}
                />
                <input
                  type="hidden"
                  name="publicationId"
                  value={selectedPublication.id}
                />
                {PUBLICATION_STATUSES.map((status) => (
                  <button
                    key={status}
                    type="submit"
                    name="status"
                    value={status}
                    disabled={selectedPublication.status === status}
                    className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface disabled:opacity-40"
                  >
                    {status}
                  </button>
                ))}
              </form>

              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gcw-zinc">
                Events
              </h3>
              <ul className="mt-3 space-y-2">
                {events.map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{ev.status}</span>
                    {ev.details ? (
                      <span className="text-gcw-muted"> — {ev.details}</span>
                    ) : null}
                    <p className="mt-1 text-xs text-gcw-zinc">
                      {new Date(ev.createdAtUtc).toLocaleString()}
                    </p>
                  </li>
                ))}
                {events.length === 0 ? (
                  <li className="text-sm text-gcw-muted">No events yet.</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
