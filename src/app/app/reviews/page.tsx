import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  listAssets,
  listAssetVersions,
  listAllClients,
  listCampaigns,
  listReviewComments,
  resolveReviewComment,
  type ContentAsset,
  type GcwCampaign,
  type ReviewComment,
} from "@/lib/geek-api";

type QueueRow = {
  comment: ReviewComment;
  asset: ContentAsset;
  campaign: GcwCampaign;
  versionNumber: number;
  clientId: string;
};

async function resolveAction(formData: FormData) {
  "use server";
  const commentId = String(formData.get("commentId") || "");
  const resolution = String(formData.get("resolution") || "").trim();
  const clientId = String(formData.get("clientId") || "");
  if (!commentId || !resolution) return;
  await resolveReviewComment(commentId, resolution);
  revalidatePath("/app/reviews");
  redirect(
    clientId ? `/app/reviews?clientId=${clientId}` : "/app/reviews",
  );
}

async function loadClientOptions(): Promise<{ id: string; name: string }[]> {
  return listAllClients();
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; show?: string }>;
}) {
  const { clientId: filterClientId, show } = await searchParams;
  const showResolved = show === "resolved";

  let clients: { id: string; name: string }[] = [];
  let openRows: QueueRow[] = [];
  let resolvedRows: QueueRow[] = [];
  let error: string | null = null;

  try {
    clients = await loadClientOptions();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");

    if (clientId) {
      const campaigns = await listCampaigns(clientId);
      const assetLists = await Promise.all(
        campaigns.map(async (campaign) => {
          const assets = await listAssets(campaign.id).catch(
            () => [] as ContentAsset[],
          );
          return assets.map((asset) => ({ asset, campaign }));
        }),
      );
      const pairs = assetLists.flat();

      const versionBundles = await Promise.all(
        pairs.map(async ({ asset, campaign }) => {
          const versions = await listAssetVersions(asset.id).catch(() => []);
          const latest = [...versions].sort(
            (a, b) => b.versionNumber - a.versionNumber,
          )[0];
          if (!latest) return [] as QueueRow[];
          const comments = await listReviewComments(latest.id).catch(
            () => [] as ReviewComment[],
          );
          return comments.map((comment) => ({
            comment,
            asset,
            campaign,
            versionNumber: latest.versionNumber,
            clientId,
          }));
        }),
      );

      const all = versionBundles.flat();
      openRows = all.filter((r) => !r.comment.resolution);
      resolvedRows = all.filter((r) => !!r.comment.resolution);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load reviews";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const rows = showResolved ? resolvedRows : openRows;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Creation
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Reviews
      </h1>
      <p className="mt-2 text-gcw-muted">
        Open review comments across latest asset versions for a client.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      <form className="mt-8 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block text-gcw-muted">Client</span>
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
        </label>
        {showResolved ? (
          <input type="hidden" name="show" value="resolved" />
        ) : null}
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 flex gap-3 text-sm">
        <Link
          href={
            selectedClientId
              ? `/app/reviews?clientId=${selectedClientId}`
              : "/app/reviews"
          }
          className={
            !showResolved
              ? "font-semibold text-gcw-ink"
              : "text-gcw-muted hover:text-gcw-ink"
          }
        >
          Open ({openRows.length})
        </Link>
        <Link
          href={
            selectedClientId
              ? `/app/reviews?clientId=${selectedClientId}&show=resolved`
              : "/app/reviews?show=resolved"
          }
          className={
            showResolved
              ? "font-semibold text-gcw-ink"
              : "text-gcw-muted hover:text-gcw-ink"
          }
        >
          Resolved ({resolvedRows.length})
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {rows.map((row) => (
          <li
            key={row.comment.id}
            className="rounded-2xl border border-gcw-line bg-white p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{row.asset.name}</p>
              <p className="text-xs text-gcw-zinc">
                {row.campaign.name} · v{row.versionNumber}
              </p>
            </div>
            {row.comment.sectionPath ? (
              <p className="mt-1 text-xs text-gcw-zinc">
                {row.comment.sectionPath}
              </p>
            ) : null}
            <p className="mt-3 text-sm">{row.comment.content}</p>
            {row.comment.resolution ? (
              <p className="mt-2 text-xs text-gcw-muted">
                Resolved: {row.comment.resolution}
              </p>
            ) : (
              <form action={resolveAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="commentId" value={row.comment.id} />
                <input type="hidden" name="clientId" value={row.clientId} />
                <input
                  name="resolution"
                  required
                  placeholder="Resolution note"
                  className="min-w-[12rem] flex-1 rounded-lg border border-gcw-line px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  Resolve
                </button>
              </form>
            )}
            <p className="mt-3 text-sm">
              <Link
                href={`/app/assets/${row.asset.id}?clientId=${row.clientId}&versionId=${row.comment.assetVersionId}`}
                className="font-medium text-gcw-ink underline-offset-2 hover:underline"
              >
                Open asset →
              </Link>
            </p>
          </li>
        ))}
        {!selectedClientId && !error ? (
          <li className="text-sm text-gcw-muted">Select a client to load reviews.</li>
        ) : null}
        {selectedClientId && rows.length === 0 && !error ? (
          <li className="text-sm text-gcw-muted">
            {showResolved
              ? "No resolved comments for this client."
              : "No open review comments."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
