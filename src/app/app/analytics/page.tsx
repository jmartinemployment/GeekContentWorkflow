import Link from "next/link";
import {
  listAssets,
  listCampaigns,
  listClients,
  listProjects,
  listPublications,
  listAssetVersions,
  type ContentAsset,
  type GcwCampaign,
  type Publication,
} from "@/lib/geek-api";

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item) || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId: filterClientId } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let campaigns: GcwCampaign[] = [];
  let assets: ContentAsset[] = [];
  let publications: Publication[] = [];
  let error: string | null = null;

  try {
    [clients, projects] = await Promise.all([listClients(), listProjects()]);
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      campaigns = await listCampaigns(clientId);
      const assetLists = await Promise.all(
        campaigns.map((c) => listAssets(c.id).catch(() => [] as ContentAsset[])),
      );
      assets = assetLists.flat();
      const versionLists = await Promise.all(
        assets.map((a) => listAssetVersions(a.id).catch(() => [])),
      );
      const latestVersionIds = versionLists
        .map((vs) =>
          [...vs].sort((a, b) => b.versionNumber - a.versionNumber)[0]?.id,
        )
        .filter(Boolean) as string[];
      const pubLists = await Promise.all(
        latestVersionIds.map((id) =>
          listPublications(id).catch(() => [] as Publication[]),
        ),
      );
      publications = pubLists.flat();
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load analytics";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const projectByStatus = countBy(projects, (p) => p.status);
  const campaignByStatus = countBy(campaigns, (c) => c.status);
  const assetByStatus = countBy(assets, (a) => a.status);
  const publicationByStatus = countBy(publications, (p) => p.status);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Analytics
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Pipeline &amp; outcomes
      </h1>
      <p className="mt-2 text-gcw-muted">
        Rollups from campaigns, assets, and publications for the selected client,
        plus CWV2 project statuses. Site-level SEO/GA stays in GeekSeoBackend.
      </p>

      {error ? <p className="mt-6 text-sm text-gcw-muted">{error}</p> : null}

      <form className="mt-8 flex flex-wrap gap-3" method="get">
        <select
          name="clientId"
          defaultValue={selectedClientId}
          className="rounded-lg border border-gcw-line bg-white px-3 py-2 text-sm"
        >
          <option value="">All clients (CWV2 projects only)</option>
          {clients.map((c) => (
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

      <section className="mt-10">
        <h2 className="font-heading text-lg font-medium">Campaigns</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(campaignByStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border border-gcw-line bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gcw-zinc">
                {status}
              </p>
              <p className="mt-1 font-heading text-2xl font-medium">{count}</p>
            </div>
          ))}
          {Object.keys(campaignByStatus).length === 0 ? (
            <p className="text-sm text-gcw-muted sm:col-span-3">
              {selectedClientId
                ? "No campaigns for this client."
                : "Select a client to see campaign rollups."}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-medium">Assets</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(assetByStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border border-gcw-line bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gcw-zinc">
                {status}
              </p>
              <p className="mt-1 font-heading text-2xl font-medium">{count}</p>
            </div>
          ))}
          {Object.keys(assetByStatus).length === 0 ? (
            <p className="text-sm text-gcw-muted sm:col-span-3">No assets.</p>
          ) : null}
        </div>
        <p className="mt-3 text-sm">
          <Link
            href={`/app/assets${selectedClientId ? `?clientId=${selectedClientId}` : ""}`}
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Open assets →
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-medium">
          Publications (latest versions)
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(publicationByStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border border-gcw-line bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gcw-zinc">
                {status}
              </p>
              <p className="mt-1 font-heading text-2xl font-medium">{count}</p>
            </div>
          ))}
          {Object.keys(publicationByStatus).length === 0 ? (
            <p className="text-sm text-gcw-muted sm:col-span-3">
              No publications yet.
            </p>
          ) : null}
        </div>
        <p className="mt-3 text-sm">
          <Link
            href={`/app/publications${selectedClientId ? `?clientId=${selectedClientId}` : ""}`}
            className="font-medium text-gcw-ink underline-offset-2 hover:underline"
          >
            Open publications →
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-lg font-medium">CWV2 projects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(projectByStatus).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border border-gcw-line bg-white p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gcw-zinc">
                {status}
              </p>
              <p className="mt-1 font-heading text-2xl font-medium">{count}</p>
            </div>
          ))}
          {Object.keys(projectByStatus).length === 0 && !error ? (
            <p className="text-sm text-gcw-muted sm:col-span-3">No projects.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
