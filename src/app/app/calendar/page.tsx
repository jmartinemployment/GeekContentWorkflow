import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CALENDAR_CHANNELS,
  createCalendarEntry,
  listAllClients,
  listAssets,
  listAssetVersions,
  listCalendarEntries,
  listCampaigns,
  updateCalendarEntry,
  type ContentAsset,
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
  if (!clientId || !campaignId || !assetVersionId || !channel || !localWhen) return;

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
    redirect(
      `/app/calendar?clientId=${clientId}&campaignId=${campaignId}&scheduled=1`,
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

async function markPostedAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const entryId = String(formData.get("entryId") || "");
  if (!entryId) return;
  await updateCalendarEntry(entryId, { status: "posted" });
  revalidatePath("/app/calendar");
  redirect(`/app/calendar?clientId=${clientId}&campaignId=${campaignId}`);
}

async function cancelAction(formData: FormData) {
  "use server";
  const clientId = String(formData.get("clientId") || "");
  const campaignId = String(formData.get("campaignId") || "");
  const entryId = String(formData.get("entryId") || "");
  if (!entryId) return;
  await updateCalendarEntry(entryId, { status: "cancelled" });
  revalidatePath("/app/calendar");
  redirect(`/app/calendar?clientId=${clientId}&campaignId=${campaignId}`);
}

function startOfWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
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

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gcw-zinc">
        Publishing
      </p>
      <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight">
        Social calendar
      </h1>
      <p className="mt-2 text-gcw-muted">
        Schedule companion posts and visuals onto channels. Mark posted when it
        goes live — this is the GCW calendar, not a third-party scheduler yet.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error}
        </p>
      ) : null}
      {scheduled ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Scheduled — it appears on the week grid below.
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
            <div className="flex gap-2 text-sm">
              <Link
                href={`/app/calendar?clientId=${selectedClientId}&campaignId=${selectedCampaignId}&week=${prevWeek.toISOString()}`}
                className="rounded-pill border border-gcw-line px-3 py-1.5 hover:bg-white"
              >
                ← Prev
              </Link>
              <Link
                href={`/app/calendar?clientId=${selectedClientId}&campaignId=${selectedCampaignId}&week=${nextWeek.toISOString()}`}
                className="rounded-pill border border-gcw-line px-3 py-1.5 hover:bg-white"
              >
                Next →
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {days.map((day) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayEntries = entries.filter((e) =>
                e.scheduledAtUtc.startsWith(dayKey),
              );
              return (
                <div
                  key={dayKey}
                  className="min-h-[140px] rounded-2xl border border-gcw-line bg-white p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gcw-zinc">
                    {day.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {dayEntries.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-lg border border-gcw-line px-2 py-1.5 text-xs"
                      >
                        <p className="font-medium text-gcw-ink">
                          {e.channel} · {e.status}
                        </p>
                        <p className="mt-0.5 text-gcw-muted line-clamp-2">
                          {e.title}
                        </p>
                        <p className="mt-0.5 text-gcw-zinc">
                          {new Date(e.scheduledAtUtc).toLocaleTimeString(
                            undefined,
                            { hour: "numeric", minute: "2-digit" },
                          )}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Link
                            href={`/app/assets/${e.assetId}?clientId=${selectedClientId}&versionId=${e.assetVersionId}`}
                            className="underline"
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
                                <input type="hidden" name="entryId" value={e.id} />
                                <button type="submit" className="underline">
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
                                <input type="hidden" name="entryId" value={e.id} />
                                <button type="submit" className="underline">
                                  Cancel
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </li>
                    ))}
                    {dayEntries.length === 0 ? (
                      <li className="text-xs text-gcw-zinc">—</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>

          <form
            action={scheduleAction}
            className="mt-10 space-y-3 rounded-2xl border border-gcw-line bg-white p-5"
          >
            <h2 className="font-heading text-lg font-medium">
              Schedule a post
            </h2>
            <p className="text-sm text-gcw-muted">
              Pick any campaign asset (companions from Repurpose / Video SEO /
              Visuals work best) and a channel time.
            </p>
            <input type="hidden" name="clientId" value={selectedClientId} />
            <input type="hidden" name="campaignId" value={selectedCampaignId} />
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
                return (
                  <option key={a.id} value={versionId}>
                    {a.name} ({a.type})
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
              Add to calendar
            </button>
          </form>
        </>
      ) : (
        <p className="mt-8 text-sm text-gcw-muted">
          Select a client and campaign to open the week view.
        </p>
      )}
    </div>
  );
}
