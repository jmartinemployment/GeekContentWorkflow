import { ArrowRightIcon } from "@/components/icons";

const IMPRESSION_ROWS = [
  { value: "2,910,000", accent: true },
  { value: "2,500,000", accent: false },
  { value: "2,000,000", accent: false },
  { value: "1,500,000", accent: false },
  { value: "1,000,000", accent: false },
  { value: "500,000", accent: false },
  { value: "250,000", accent: false },
  { value: "100,000", accent: false },
] as const;

const MONTHS = [
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
] as const;

export function ResultsSection() {
  return (
    <section className="px-5 py-16 md:py-24">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-12 md:gap-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div className="flex flex-col gap-5 pt-1">
            <span className="inline-flex w-fit items-center rounded-pill border border-gcw-line bg-white px-3 py-1 text-[13px] font-medium tracking-[0.2px] text-gcw-ink">
              The Results
            </span>
            <h2 className="font-heading max-w-[420px] text-[32px] font-medium leading-[1.15] tracking-[-1px] text-gcw-ink md:text-[40px] md:tracking-[-1.4px]">
              Don&apos;t believe us? We have the receipts.
            </h2>
            <p className="max-w-[420px] text-[16px] leading-[1.65] text-gcw-muted md:text-[17px]">
              We built Geek Content Workflow around the exact workflow we&apos;ve used to scale
              our web traffic over 6000% in the last 6 months.
            </p>
          </div>

          <div className="w-full" aria-hidden>
            <div className="flex flex-col gap-1.5">
              {IMPRESSION_ROWS.map((row) => (
                <div key={row.value} className="flex items-center gap-3">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[11px] font-medium tabular-nums tracking-[0.2px] ${
                      row.accent
                        ? "bg-emerald-500 text-white"
                        : "bg-gcw-ink text-white"
                    }`}
                  >
                    {row.value}
                  </span>
                  <span className="h-px flex-1 bg-gcw-line" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between px-1 text-[10px] font-medium tracking-[0.3px] text-gcw-zinc-soft">
              {MONTHS.map((month, i) => (
                <span
                  key={month}
                  className={
                    i === MONTHS.length - 1 ? "text-gcw-ink" : undefined
                  }
                >
                  {month}
                </span>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] tracking-[0.2px] text-gcw-zinc">
              Geek Content Workflow Organic Search Impressions
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <a
            href="#"
            className="inline-flex max-w-full items-center gap-2 rounded-pill bg-gcw-ink px-5 py-3 text-[14px] font-semibold tracking-[0.3px] text-white transition-opacity hover:opacity-90"
          >
            <span className="truncate">
              How Geek Content Workflow Hit 10M Impressions With a One-Person Marketing Team
            </span>
            <ArrowRightIcon className="size-3.5 shrink-0" />
          </a>
        </div>
      </div>
    </section>
  );
}
