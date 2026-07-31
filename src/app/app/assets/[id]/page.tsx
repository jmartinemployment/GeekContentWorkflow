import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  APPROVAL_ACTIONS,
  ASSET_STATUSES,
  createApprovalEvent,
  createAssetVersion,
  createReviewComment,
  getAsset,
  getCampaign,
  listApprovalEvents,
  listAssetVersions,
  listReviewComments,
  resolveReviewComment,
  updateAssetStatus,
  type ApprovalEvent,
  type ContentAssetVersion,
  type ReviewComment,
} from "@/lib/geek-api";

const DEFAULT_DOC = JSON.stringify(
  {
    lede: "Opening lede…",
    sections: [
      {
        heading: "Section one",
        paragraphs: [{ $type: "text", runs: [{ text: "Draft body." }] }],
      },
    ],
  },
  null,
  2,
);

function nextAssetStatus(current: string): string | null {
  const i = ASSET_STATUSES.indexOf(
    current as (typeof ASSET_STATUSES)[number],
  );
  if (i < 0 || i >= ASSET_STATUSES.length - 1) return null;
  return ASSET_STATUSES[i + 1];
}

async function createVersionAction(formData: FormData) {
  "use server";
  const assetId = String(formData.get("assetId") || "");
  const clientId = String(formData.get("clientId") || "");
  const bodyDocumentJson = String(formData.get("bodyDocumentJson") || "").trim();
  if (!assetId || !bodyDocumentJson) return;

  try {
    JSON.parse(bodyDocumentJson);
  } catch {
    redirect(
      `/app/assets/${assetId}?clientId=${clientId}&error=${encodeURIComponent("Body must be valid JSON")}`,
    );
  }

  await createAssetVersion({ assetId, bodyDocumentJson });
  revalidatePath(`/app/assets/${assetId}`);
  redirect(`/app/assets/${assetId}?clientId=${clientId}`);
}

async function updateStatusAction(formData: FormData) {
  "use server";
  const assetId = String(formData.get("assetId") || "");
  const clientId = String(formData.get("clientId") || "");
  const status = String(formData.get("status") || "").trim();
  if (!assetId || !status) return;

  await updateAssetStatus(assetId, status);
  revalidatePath(`/app/assets/${assetId}`);
  redirect(`/app/assets/${assetId}?clientId=${clientId}`);
}

async function createCommentAction(formData: FormData) {
  "use server";
  const assetId = String(formData.get("assetId") || "");
  const clientId = String(formData.get("clientId") || "");
  const assetVersionId = String(formData.get("assetVersionId") || "");
  const content = String(formData.get("content") || "").trim();
  const sectionPath = String(formData.get("sectionPath") || "").trim() || null;
  if (!assetId || !assetVersionId || !content) return;

  await createReviewComment({ assetVersionId, content, sectionPath });
  revalidatePath(`/app/assets/${assetId}`);
  redirect(
    `/app/assets/${assetId}?clientId=${clientId}&versionId=${assetVersionId}`,
  );
}

async function resolveCommentAction(formData: FormData) {
  "use server";
  const assetId = String(formData.get("assetId") || "");
  const clientId = String(formData.get("clientId") || "");
  const versionId = String(formData.get("versionId") || "");
  const commentId = String(formData.get("commentId") || "");
  const resolution = String(formData.get("resolution") || "").trim();
  if (!assetId || !commentId || !resolution) return;

  await resolveReviewComment(commentId, resolution);
  revalidatePath(`/app/assets/${assetId}`);
  redirect(
    `/app/assets/${assetId}?clientId=${clientId}&versionId=${versionId}`,
  );
}

async function createApprovalAction(formData: FormData) {
  "use server";
  const assetId = String(formData.get("assetId") || "");
  const clientId = String(formData.get("clientId") || "");
  const assetVersionId = String(formData.get("assetVersionId") || "");
  const action = String(formData.get("action") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!assetId || !assetVersionId || !action) return;

  await createApprovalEvent({ assetVersionId, action, notes });
  if (action === "approved") {
    await updateAssetStatus(assetId, "approved");
  } else if (action === "submitted") {
    await updateAssetStatus(assetId, "readyForApproval");
  }
  revalidatePath(`/app/assets/${assetId}`);
  redirect(
    `/app/assets/${assetId}?clientId=${clientId}&versionId=${assetVersionId}`,
  );
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    clientId?: string;
    versionId?: string;
    error?: string;
  }>;
}) {
  const { id } = await params;
  const {
    clientId = "",
    versionId: filterVersionId,
    error: queryError,
  } = await searchParams;

  let asset: Awaited<ReturnType<typeof getAsset>> | null = null;
  let campaignName: string | null = null;
  let versions: ContentAssetVersion[] = [];
  let comments: ReviewComment[] = [];
  let approvals: ApprovalEvent[] = [];
  let error: string | null = queryError || null;

  try {
    asset = await getAsset(id);
    try {
      const campaign = await getCampaign(asset.campaignId);
      campaignName = campaign.name;
    } catch {
      campaignName = null;
    }
    versions = await listAssetVersions(id);
    versions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load asset";
  }

  const selectedVersionId =
    filterVersionId || (versions.length ? versions[0].id : "");

  if (selectedVersionId) {
    try {
      [comments, approvals] = await Promise.all([
        listReviewComments(selectedVersionId),
        listApprovalEvents(selectedVersionId),
      ]);
      comments = [...comments].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
      approvals = [...approvals].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load reviews";
    }
  }

  if (!asset) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <p className="text-sm text-gcw-muted">{error || "Asset not found"}</p>
        <Link href="/app/assets" className="mt-4 inline-block text-sm underline">
          ← Assets
        </Link>
      </div>
    );
  }

  const advance = nextAssetStatus(asset.status);
  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) || null;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <Link
        href={`/app/assets?clientId=${clientId}&campaignId=${asset.campaignId}`}
        className="text-xs font-medium text-gcw-zinc hover:text-gcw-ink"
      >
        ← Assets
      </Link>

      <h1 className="mt-3 font-heading text-3xl font-medium tracking-tight">
        {asset.name}
      </h1>
      <p className="mt-2 text-sm text-gcw-muted">
        {campaignName ? `${campaignName} · ` : null}
        {asset.type} · {asset.status}
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {advance ? (
        <form action={updateStatusAction} className="mt-4">
          <input type="hidden" name="assetId" value={asset.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="status" value={advance} />
          <button
            type="submit"
            className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
          >
            Advance status → {advance}
          </button>
        </form>
      ) : null}

      <form
        action={createVersionAction}
        className="mt-8 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
      >
        <h2 className="font-heading text-lg font-medium">New draft version</h2>
        <p className="text-sm text-gcw-muted">
          Structured ContentDocument JSON (lede + sections).
        </p>
        <input type="hidden" name="assetId" value={asset.id} />
        <input type="hidden" name="clientId" value={clientId} />
        <textarea
          name="bodyDocumentJson"
          required
          rows={10}
          defaultValue={
            selectedVersion?.bodyDocumentJson
              ? (() => {
                  try {
                    return JSON.stringify(
                      JSON.parse(selectedVersion.bodyDocumentJson),
                      null,
                      2,
                    );
                  } catch {
                    return selectedVersion.bodyDocumentJson;
                  }
                })()
              : DEFAULT_DOC
          }
          className="w-full rounded-lg border border-gcw-line px-3 py-2 font-mono text-xs"
        />
        <button
          type="submit"
          className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
        >
          Save version
        </button>
      </form>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-medium">Versions</h2>
        {versions.length === 0 ? (
          <p className="mt-2 text-sm text-gcw-muted">No versions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {versions.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/app/assets/${asset.id}?clientId=${clientId}&versionId=${v.id}`}
                  className={`block rounded-xl border px-4 py-3 text-sm ${
                    v.id === selectedVersionId
                      ? "border-gcw-ink bg-white"
                      : "border-gcw-line bg-white hover:border-gcw-ink/20"
                  }`}
                >
                  v{v.versionNumber} ·{" "}
                  {new Date(v.createdAtUtc).toLocaleString()}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedVersion ? (
        <>
          <div className="mt-10 rounded-2xl border border-gcw-line bg-white p-5">
            <h2 className="font-heading text-lg font-medium">
              Review comments · v{selectedVersion.versionNumber}
            </h2>
            <ul className="mt-4 space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                >
                  <p>{c.content}</p>
                  <p className="mt-1 text-xs text-gcw-zinc">
                    {c.sectionPath ? `${c.sectionPath} · ` : ""}
                    {c.resolution
                      ? `Resolved: ${c.resolution}`
                      : "Open"}
                  </p>
                  {!c.resolution ? (
                    <form action={resolveCommentAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="assetId" value={asset.id} />
                      <input type="hidden" name="clientId" value={clientId} />
                      <input
                        type="hidden"
                        name="versionId"
                        value={selectedVersion.id}
                      />
                      <input type="hidden" name="commentId" value={c.id} />
                      <input
                        name="resolution"
                        required
                        placeholder="Resolution note"
                        className="flex-1 rounded-lg border border-gcw-line px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-pill border border-gcw-line px-3 py-1 text-xs font-medium hover:bg-gcw-surface"
                      >
                        Resolve
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
              {comments.length === 0 ? (
                <li className="text-sm text-gcw-muted">No comments yet.</li>
              ) : null}
            </ul>
            <form action={createCommentAction} className="mt-4 space-y-2 border-t border-gcw-line pt-4">
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="clientId" value={clientId} />
              <input
                type="hidden"
                name="assetVersionId"
                value={selectedVersion.id}
              />
              <input
                name="sectionPath"
                placeholder="Section path (optional)"
                className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              />
              <textarea
                name="content"
                required
                rows={2}
                placeholder="Comment"
                className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
              >
                Add comment
              </button>
            </form>
          </div>

          <div className="mt-8 rounded-2xl border border-gcw-line bg-white p-5">
            <h2 className="font-heading text-lg font-medium">
              Approval events · v{selectedVersion.versionNumber}
            </h2>
            <ul className="mt-4 space-y-2">
              {approvals.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
                >
                  <span className="font-medium">{ev.action}</span>
                  {ev.notes ? (
                    <span className="text-gcw-muted"> — {ev.notes}</span>
                  ) : null}
                  <p className="mt-1 text-xs text-gcw-zinc">
                    {new Date(ev.createdAtUtc).toLocaleString()}
                  </p>
                </li>
              ))}
              {approvals.length === 0 ? (
                <li className="text-sm text-gcw-muted">No approval events yet.</li>
              ) : null}
            </ul>
            <form action={createApprovalAction} className="mt-4 space-y-2 border-t border-gcw-line pt-4">
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="clientId" value={clientId} />
              <input
                type="hidden"
                name="assetVersionId"
                value={selectedVersion.id}
              />
              <select
                name="action"
                required
                defaultValue="submitted"
                className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              >
                {APPROVAL_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                name="notes"
                placeholder="Notes (optional)"
                className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Record approval event
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
