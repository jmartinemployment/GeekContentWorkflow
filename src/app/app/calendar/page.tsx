import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CopyPostButton } from "@/components/app/CopyPostButton";
import {
  flattenDocumentText,
  parseContentDocument,
} from "@/lib/content-document";
import {
  inferChannelFromAssetName,
  isCompanionLikeAsset,
} from "@/lib/calendar-channel";
import {
  CALENDAR_CHANNELS,
  createCalendarEntry,
  getAssetVersion,
  listAllClients,
  listAssets,
  listAssetVersions,
  listCalendarEntries,
  listCampaigns,
  updateCalendarEntry,
  type ContentAsset,
  type ContentAssetVersion,
  type GcwCampaign,
  type SocialScheduleEntry,
} from "@/lib/geek-api";

async function scheduleAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const assetVersionId = String(formData.get("assetVersionId") || "");
  const channel = String(formData.get("channel") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const localWhen = String(formData.get("scheduledLocal") || "").trim();
  const week = String(formData.get("week") || "");
  if (!clientId || !campaignId || !assetVersionId || !channel || !localWhen)
    return;

  const scheduledAtUtc = new Date(localWhen).toISOString();
  try {
    await createCalendarEntry({
      campaignId,
      assetVersionId,
      channel,
      scheduledAtUtc,
      ...(title ? { title } : {}),
      ...(notes ? { notes } : {}),
    });
    revalidatePath("/app/calendar");
    const weekQ = week ? `&week=${encodeURIComponent(week)}` : "";
    redirect(
      `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&scheduled=1${weekQ}`,
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
    const msg = e instanceof Error ? e.message : "Schedule failed";
    redirect(
      `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&error=${encodeURIComponent(msg)}`,
    );
  }
}

async function fillWeekAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const weekRaw = String(formData.get("week") || "");
  if (!clientId || !campaignId || !weekRaw) return;

  const weekStart = startOfWeek(new Date(weekRaw));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  try {
    const [assets, existing] = await Promise.all([
      listAssets(campaignId),
      listCalendarEntries({
        campaignId,
        fromUtc: weekStart.toISOString(),
        toUtc: weekEnd.toISOString(),
      }),
    ]);

    const alreadyVersionIds = new Set(existing.map((e) => e.assetVersionId));
    const alreadyAssetIds = new Set(existing.map((e) => e.assetId));

    const companions = assets.filter((a) =>
      isCompanionLikeAsset(a.type, a.name),
    );

    const candidates: {
      asset: ContentAsset;
      versionId: string;
      channel: string;
    }[] = [];

    for (const asset of companions) {
      if (alreadyAssetIds.has(asset.id)) continue;
      const channel = inferChannelFromAssetName(asset.name);
      if (!channel) continue;
      const versions = await listAssetVersions(asset.id).catch(() => []);
      const latest = [...versions].sort(
        (x, y) => y.versionNumber - x.versionNumber,
      )[0];
      if (!latest) continue;
      if (alreadyVersionIds.has(latest.id)) continue;
      candidates.push({ asset, versionId: latest.id, channel });
    }

    if (candidates.length === 0) {
      redirect(
        `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&week=${weekStart.toISOString()}&error=${encodeURIComponent(
          "No unscheduled companions with a channel name (LinkedIn, X, Instagram…). Generate a channel pack first.",
        )}`,
      );
    }

    // Mon–Fri slots at 10:00 / 12:00 / 14:00 / 16:00 UTC
    const hours = [10, 12, 14, 16];
    let created = 0;
    for (let i = 0; i < candidates.length; i++) {
      const dayOffset = i % 5; // Mon=0 … Fri=4
      const hour = hours[Math.floor(i / 5) % hours.length];
      const when = new Date(weekStart);
      when.setUTCDate(when.getUTCDate() + dayOffset);
      when.setUTCHours(hour, 0, 0, 0);

      const { asset, versionId, channel } = candidates[i];
      await createCalendarEntry({
        campaignId,
        assetVersionId: versionId,
        channel,
        scheduledAtUtc: when.toISOString(),
        title: asset.name,
      });
      created += 1;
    }

    revalidatePath("/app/calendar");
    redirect(
      `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&week=${weekStart.toISOString()}&scheduled=${created}`,
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
    const msg = e instanceof Error ? e.message : "Fill week failed";
    redirect(
      `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&error=${encodeURIComponent(msg)}`,
    );
  }
}

async function markPostedAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const entryId = String(formData.get("entryId") || "");
  const week = String(formData.get("week") || "");
  if (!entryId) return;
  await updateCalendarEntry(entryId, { status: "posted" });
  revalidatePath("/app/calendar");
  const weekQ = week ? `&week=${encodeURIComponent(week)}` : "";
  redirect(
    `/app/calendar?clientId=${clientId}&campaignId=${campaignId}${weekQ}`,
  );
}

async function cancelAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const entryId = String(formData.get("entryId") || "");
  const week = String(formData.get("week") || "");
  if (!entryId) return;
  await updateCalendarEntry(entryId, { status: "cancelled" });
  revalidatePath("/app/calendar");
  const weekQ = week ? `&week=${encodeURIComponent(week)}` : "";
  redirect(
    `/app/calendar?clientId=${clientId}&campaignId=${campaignId}${weekQ}`,
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function postTextFromVersion(version: ContentAssetVersion | null): string {
  if (!version?.bodyDocumentJson) return "";
  const doc = parseContentDocument(version.bodyDocumentJson);
  if (!doc) return "";
  return flattenDocumentText(doc).trim();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    campaignId?: string;
    week?: string;
    error?: string;
    scheduled?: string;
  }>;
}) {
  const {
    clientId: filterClientId,
    campaignId: filterCampaignId,
    week: weekParam,
    error: queryError,
    scheduled,
  } = await searchParams;

  let clients: { id: string; name: string }[] = [];
  let campaigns: GcwCampaign[] = [];
  let assets: ContentAsset[] = [];
  let latestByAsset: Record<string, string> = {};
  let entries: SocialScheduleEntry[] = [];
  let postByVersion: Record<string, string> = {};
  let error: string | null = queryError || null;

  const weekStart = weekParam
    ? startOfWeek(new Date(weekParam))
    : startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  try {
    clients = await listAllClients();
    const clientId =
      filterClientId || (clients.length === 1 ? clients[0].id : "");
    if (clientId) campaigns = await listCampaigns(clientId);
    const campaignId =
      filterCampaignId ||
      (campaigns.length === 1 ? campaigns[0].id : "");
    if (campaignId) {
      assets = await listAssets(campaignId);
      const versionLists = await Promise.all(
        assets.map(async (a) => {
          const versions = await listAssetVersions(a.id).catch(() => []);
          const latest = [...versions].sort(
            (x, y) => y.versionNumber - x.versionNumber,
          )[0];
          return [a.id, latest?.id ?? ""] as const;
        }),
      );
      latestByAsset = Object.fromEntries(versionLists);
      entries = await listCalendarEntries({
        campaignId,
        fromUtc: weekStart.toISOString(),
        toUtc: weekEnd.toISOString(),
      });
      const versionIds = [...new Set(entries.map((e) => e.assetVersionId))];
      const versions = await Promise.all(
        versionIds.map((id) => getAssetVersion(id).catch(() => null)),
      );
      postByVersion = Object.fromEntries(
        versionIds.map((id, i) => [id, postTextFromVersion(versions[i])]),
      );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load calendar";
  }

  const selectedClientId =
    filterClientId || (clients.length === 1 ? clients[0]?.id : "") || "";
  const selectedCampaignId =
    filterCampaignId ||
    (campaigns.length === 1 ? campaigns[0]?.id : "") ||
    "";

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  const prevWeek = new Date(weekStart);
  prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

  const defaultLocal = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.scheduledAtUtc).getTime() -
      new Date(b.scheduledAtUtc).getTime(),
  );

  const companionCount = assets.filter((a) =>
    isCompanionLikeAsset(a.type, a.name),
  ).length;

  const weekIso = weekStart.toISOString();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Publishing
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Publishing queue
      </h1>
      <p className="mt-2 text-gcw-muted">
        This week’s posts with full copy — copy to paste into LinkedIn, X, or
        wherever you publish. Fill the week from companion packs in one click.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      {scheduled ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {scheduled === "1"
            ? "Scheduled — post copy is in the queue below."
            : `${scheduled} posts added to this week’s queue.`}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/app/calendar?clientId=${c.id}`}
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
              href={`/app/calendar?clientId=${selectedClientId}&campaignId=${c.id}`}
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
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-medium">
              Week of{" "}
              {weekStart.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                href={`/app/calendar?clientId=${selectedClientId}&campaignId=${selectedCampaignId}&week=${encodeURIComponent(prevWeek.toISOString())}`}
                className="rounded-pill border border-gcw-line px-3 py-1.5 hover:bg-white"
              >
                ← Prev
              </Link>
              <Link
                href={`/app/calendar?clientId=${selectedClientId}&campaignId=${selectedCampaignId}&week=${encodeURIComponent(nextWeek.toISOString())}`}
                className="rounded-pill border border-gcw-line px-3 py-1.5 hover:bg-white"
              >
                Next →
              </Link>
            </div>
          </div>

          {/* Compact day strip */}
          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Days this week">
            {days.map((day) => {
              const dayKey = day.toISOString().slice(0, 10);
              const count = entries.filter((e) =>
                e.scheduledAtUtc.startsWith(dayKey),
              ).length;
              return (
                <a
                  key={dayKey}
                  href={`#day-${dayKey}`}
                  className="rounded-pill border border-gcw-line bg-white px-3 py-1.5 text-xs font-medium text-gcw-ink hover:border-gcw-ink/30"
                >
                  {day.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                  {count > 0 ? ` · ${count}` : ""}
                </a>
              );
            })}
          </nav>

          <form action={fillWeekAction} className="mt-6">
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input type="hidden" name="campaignId" value={selectedCampaignId} />
            <input type="hidden" name="week" value={weekIso} />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Fill week from companions
              {companionCount ? ` (${companionCount})` : ""}
            </button>
            <p className="mt-2 text-xs text-gcw-muted">
              Schedules unscheduled LinkedIn / X / Instagram / etc. companions
              across Mon–Fri with their draft copy ready to paste.
            </p>
          </form>

          {/* Primary: publishing queue */}
          <div className="mt-10 space-y-8">
            {days.map((day) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayEntries = sortedEntries.filter((e) =>
                e.scheduledAtUtc.startsWith(dayKey),
              );
              if (dayEntries.length === 0) return null;
              return (
                <section key={dayKey} id={`day-${dayKey}`}>
                  <h3 className="font-heading text-base font-medium text-gcw-ink">
                    {day.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </h3>
                  <ul className="mt-3 space-y-4">
                    {dayEntries.map((e) => {
                      const text = postByVersion[e.assetVersionId] || "";
                      return (
                        <li
                          key={e.id}
                          className="rounded-2xl border border-gcw-line bg-white p-5"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold capitalize text-gcw-ink">
                              {e.channel}{" "}
                              <span className="font-normal text-gcw-zinc">
                                · {e.status} ·{" "}
                                {new Date(e.scheduledAtUtc).toLocaleTimeString(
                                  undefined,
                                  {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    timeZone: "UTC",
                                  },
                                )}{" "}
                                UTC
                              </span>
                            </p>
                            <p className="text-xs text-gcw-muted line-clamp-1">
                              {e.title}
                            </p>
                          </div>
                          {text ? (
                            <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-gcw-ink">
                              {text}
                            </pre>
                          ) : (
                            <p className="mt-4 text-sm text-gcw-muted">
                              No draft text on this version yet.
                            </p>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <CopyPostButton text={text} />
                            <Link
                              href={`/app/assets/${e.assetId}?clientId=${selectedClientId}&versionId=${e.assetVersionId}`}
                              className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                            >
                              Open
                            </Link>
                            {e.status === "scheduled" ? (
                              <>
                                <form action={markPostedAction}>
                                  <input
                                    type="hidden"
                                    name="clientId"
                                    value={selectedClientId}
                                  />
                                  <input
                                    type="hidden"
                                    name="campaignId"
                                    value={selectedCampaignId}
                                  />
                                  <input type="hidden" name="week" value={weekIso} />
                                  <input
                                    type="hidden"
                                    name="entryId"
                                    value={e.id}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium hover:bg-gcw-surface"
                                  >
                                    Posted
                                  </button>
                                </form>
                                <form action={cancelAction}>
                                  <input
                                    type="hidden"
                                    name="clientId"
                                    value={selectedClientId}
                                  />
                                  <input
                                    type="hidden"
                                    name="campaignId"
                                    value={selectedCampaignId}
                                  />
                                  <input type="hidden" name="week" value={weekIso} />
                                  <input
                                    type="hidden"
                                    name="entryId"
                                    value={e.id}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-pill border border-gcw-line px-3 py-1.5 text-xs font-medium text-gcw-zinc hover:bg-gcw-surface"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            {sortedEntries.length === 0 ? (
              <p className="text-sm text-gcw-muted">
                Queue is empty. Generate a channel pack on a pillar, then{" "}
                <strong className="font-medium text-gcw-ink">
                  Fill week from companions
                </strong>
                , or schedule one post below.
              </p>
            ) : null}
          </div>

          <form
            action={scheduleAction}
            className="mt-10 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h2 className="font-heading text-lg font-medium">
              Schedule one post
            </h2>
            <p className="text-sm text-gcw-muted">
              Manual slot — pick any asset version and time.
            </p>
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input type="hidden" name="campaignId" value={selectedCampaignId} />
            <input type="hidden" name="week" value={weekIso} />
            <select
              name="assetVersionId"
              required
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select asset version
              </option>
              {assets.map((a) => {
                const versionId = latestByAsset[a.id];
                if (!versionId) return null;
                const ch = inferChannelFromAssetName(a.name);
                return (
                  <option key={a.id} value={versionId}>
                    {a.name}
                    {ch ? ` → ${ch}` : ` (${a.type})`}
                  </option>
                );
              })}
            </select>
            <select
              name="channel"
              defaultValue="linkedin"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            >
              {CALENDAR_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              name="scheduledLocal"
              required
              defaultValue={defaultLocal}
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <input
              name="title"
              placeholder="Title override (optional)"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <textarea
              name="notes"
              rows={2}
              placeholder="Notes (optional)"
              className="w-full rounded-lg border border-gcw-line px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-pill bg-gcw-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Add to queue
            </button>
          </form>
        </>
      ) : (
        <p className="mt-8 text-sm text-gcw-muted">
          Select a client and campaign to open the publishing queue.
        </p>
      )}
    </div>
  );
}
