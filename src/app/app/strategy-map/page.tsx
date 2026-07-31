import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CAMPAIGN_STATUSES,
  createCampaign,
  createKeyword,
  KEYWORD_STATUSES,
  listCampaigns,
  listClients,
  listKeywords,
  updateCampaignStatus,
  updateKeywordStatus,
  type GcwCampaign,
  type KeywordCandidate,
} from "@/lib/geek-api";

async function createKeywordAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const keyword = String(formData.get("keyword") || "").trim();
  const intent = String(formData.get("intent") || "").trim() || null;
  const searchVolumeRaw = String(formData.get("searchVolume") || "").trim();
  const difficultyRaw = String(formData.get("difficulty") || "").trim();
  if (!clientId || !keyword) return;

  await createKeyword({
    clientId,
    keyword,
    intent,
    searchVolume: searchVolumeRaw ? Number(searchVolumeRaw) : null,
    difficulty: difficultyRaw ? Number(difficultyRaw) : null,
  });
  revalidatePath("/app/strategy-map");
  redirect(`/app/strategy-map?clientId=${clientId}`);
}

async function updateKeywordStatusAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const keywordId = String(formData.get("keywordId") || "");
  const status = String(formData.get("status") || "").trim();
  if (!clientId || !keywordId || !status) return;

  await updateKeywordStatus(keywordId, status);
  revalidatePath("/app/strategy-map");
  redirect(`/app/strategy-map?clientId=${clientId}`);
}

async function createCampaignFromKeywordAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const keywordId = String(formData.get("keywordId") || "");
  const keyword = String(formData.get("keyword") || "").trim();
  const name =
    String(formData.get("name") || "").trim() ||
    (keyword ? `${keyword} campaign` : "");
  if (!clientId || !keyword || !name) return;

  const campaign = await createCampaign({ clientId, name, keyword });
  if (keywordId) {
    await updateKeywordStatus(keywordId, "briefed");
  }
  revalidatePath("/app/strategy-map");
  revalidatePath("/app/strategy-briefs");
  redirect(
    `/app/strategy-briefs?clientId=${clientId}&campaignId=${campaign.id}`,
  );
}

async function createCampaignAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const name = String(formData.get("name") || "").trim();
  const keyword = String(formData.get("keyword") || "").trim();
  if (!clientId || !name || !keyword) return;

  const campaign = await createCampaign({ clientId, name, keyword });
  revalidatePath("/app/strategy-map");
  revalidatePath("/app/strategy-briefs");
  redirect(
    `/app/strategy-map?clientId=${clientId}&campaignId=${campaign.id}`,
  );
}

async function updateCampaignStatusAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const status = String(formData.get("status") || "").trim();
  if (!clientId || !campaignId || !status) return;

  await updateCampaignStatus(campaignId, status);
  revalidatePath("/app/strategy-map");
  redirect(`/app/strategy-map?clientId=${clientId}`);
}

function nextKeywordStatus(current: string): string | null {
  const i = KEYWORD_STATUSES.indexOf(
    current as (typeof KEYWORD_STATUSES)[number],
  );
  if (i < 0 || i >= KEYWORD_STATUSES.length - 2) return null;
  // Skip jumping straight to briefed via advance — briefed comes from campaign create
  const next = KEYWORD_STATUSES[i + 1];
  if (next === "briefed") return null;
  return next;
}

function nextCampaignStatus(current: string): string | null {
  const i = CAMPAIGN_STATUSES.indexOf(
    current as (typeof CAMPAIGN_STATUSES)[number],
  );
  if (i < 0 || i >= CAMPAIGN_STATUSES.length - 1) return null;
  return CAMPAIGN_STATUSES[i + 1];
}

export default async function StrategyMapPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; campaignId?: string }>;
}) {
  const { clientId: filterClientId } = await searchParams;

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  let keywords: KeywordCandidate[] = [];
  let campaigns: GcwCampaign[] = [];
  let error: string | null = null;

  try {
    clients = await listClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) {
      [keywords, campaigns] = await Promise.all([
        listKeywords(clientId),
        listCampaigns(clientId),
      ]);
      keywords = [...keywords].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
      );
      campaigns = [...campaigns].sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load strategy map";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Strategy Map
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Campaigns &amp; keywords
      </h1>
      <p className="mt-2 text-gcw-muted">
        Queue keyword candidates, promote them into campaigns, then write
        strategy briefs. Crawl/generate projects live under AI Drafting.
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
        <button
          type="submit"
          className="rounded-pill border border-gcw-line bg-white px-4 py-2 text-sm font-medium hover:bg-gcw-surface"
        >
          Filter
        </button>
      </form>

      {!selectedClientId ? (
        <p className="mt-6 text-sm text-gcw-muted">
          Select a client (or create one under Brand Core).
        </p>
      ) : (
        <>
          <form
            action={createKeywordAction}
            className="mt-8 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
          >
            <h2 className="font-heading text-lg font-medium sm:col-span-2">
              Add keyword
            </h2>
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input
              name="keyword"
              required
              placeholder="Keyword phrase"
              className="rounded-lg border border-gcw-line px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="intent"
              placeholder="Intent (informational, commercial…)"
              className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="searchVolume"
                type="number"
                min={0}
                placeholder="Volume"
                className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
              />
              <input
                name="difficulty"
                type="number"
                min={0}
                max={100}
                placeholder="Difficulty"
                className="rounded-lg border border-gcw-line px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white sm:col-span-2"
            >
              Add to queue
            </button>
          </form>

          <div className="mt-8">
            <h2 className="font-heading text-lg font-medium">Keyword queue</h2>
            <ul className="mt-3 space-y-3">
              {keywords.map((kw) => {
                const advance = nextKeywordStatus(kw.status);
                return (
                  <li
                    key={kw.id}
                    className="rounded-xl border border-gcw-line bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{kw.keyword}</p>
                        <p className="mt-1 text-xs text-gcw-zinc">
                          {kw.status}
                          {kw.intent ? ` · ${kw.intent}` : ""}
                          {kw.searchVolume != null
                            ? ` · vol ${kw.searchVolume}`
                            : ""}
                          {kw.difficulty != null
                            ? ` · diff ${kw.difficulty}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {advance ? (
                          <form action={updateKeywordStatusAction}>
                            <input
                              type="hidden"
                              name="clientId"
                              value={selectedClientId}
                            />
                            <input
                              type="hidden"
                              name="keywordId"
                              value={kw.id}
                            />
                            <input type="hidden" name="status" value={advance} />
                            <button
                              type="submit"
                              className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                            >
                              → {advance}
                            </button>
                          </form>
                        ) : null}
                        {kw.status !== "rejected" && kw.status !== "briefed" ? (
                          <form action={updateKeywordStatusAction}>
                            <input
                              type="hidden"
                              name="clientId"
                              value={selectedClientId}
                            />
                            <input
                              type="hidden"
                              name="keywordId"
                              value={kw.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="rejected"
                            />
                            <button
                              type="submit"
                              className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium text-gcw-muted hover:bg-gcw-surface"
                            >
                              Reject
                            </button>
                          </form>
                        ) : null}
                        {kw.status !== "briefed" && kw.status !== "rejected" ? (
                          <form action={createCampaignFromKeywordAction}>
                            <input
                              type="hidden"
                              name="clientId"
                              value={selectedClientId}
                            />
                            <input
                              type="hidden"
                              name="keywordId"
                              value={kw.id}
                            />
                            <input
                              type="hidden"
                              name="keyword"
                              value={kw.keyword}
                            />
                            <button
                              type="submit"
                              className="rounded-pill bg-gcw-ink px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Create campaign
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
              {keywords.length === 0 ? (
                <li className="text-sm text-gcw-muted">No keywords yet.</li>
              ) : null}
            </ul>
          </div>

          <form
            action={createCampaignAction}
            className="mt-10 grid gap-3 rounded-2xl border border-gcw-line bg-white p-5 sm:grid-cols-2"
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

          <div className="mt-8">
            <h2 className="font-heading text-lg font-medium">Campaigns</h2>
            <ul className="mt-3 space-y-3">
              {campaigns.map((c) => {
                const advance = nextCampaignStatus(c.status);
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-gcw-line bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="mt-1 text-xs text-gcw-zinc">
                          {c.keyword} · {c.status}
                        </p>
                        <p className="mt-0.5 text-xs text-gcw-zinc">
                          profileVersionId:{" "}
                          <code className="text-[10px]">{c.profileVersionId}</code>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {advance ? (
                          <form action={updateCampaignStatusAction}>
                            <input
                              type="hidden"
                              name="clientId"
                              value={selectedClientId}
                            />
                            <input
                              type="hidden"
                              name="campaignId"
                              value={c.id}
                            />
                            <input type="hidden" name="status" value={advance} />
                            <button
                              type="submit"
                              className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                            >
                              → {advance}
                            </button>
                          </form>
                        ) : null}
                        <Link
                          href={`/app/strategy-briefs?clientId=${selectedClientId}&campaignId=${c.id}`}
                          className="rounded-pill bg-gcw-ink px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Briefs →
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
              {campaigns.length === 0 ? (
                <li className="text-sm text-gcw-muted">No campaigns yet.</li>
              ) : null}
            </ul>
          </div>
        </>
      )}

      <p className="mt-10 text-sm text-gcw-muted">
        Need crawl/generate?{" "}
        <Link
          href="/app/drafting"
          className="font-medium text-gcw-ink underline-offset-2 hover:underline"
        >
          AI Drafting (CWV2 projects)
        </Link>
      </p>
    </div>
  );
}
