const WORKFLOW_PILLS = [
  { label: "Brand Core", icon: ShieldIcon },
  { label: "Ideal Customer", icon: TargetIcon },
  { label: "Site Metrics", icon: ChartIcon },
  { label: "Content Cycles", icon: CyclesIcon },
  { label: "Growth Plan", icon: GrowthIcon },
] as const;

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M8 1.5l5 2v4.2c0 2.8-1.9 4.8-5 6.3-3.1-1.5-5-3.5-5-6.3V3.5l5-2z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="8" cy="8" r="0.75" fill="currentColor" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M3 12.5V8M8 12.5V4M13 12.5V6.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CyclesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M12.5 5.5A5 5 0 0 0 4 4.8M3.5 10.5A5 5 0 0 0 12 11.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <path
        d="M12.5 2.5v3h-3M3.5 13.5v-3h3"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GrowthIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M3.5 11.5 7 6.5l2.5 3 3-6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeepResearch() {
  return (
    <section className="px-5 py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-[1300px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex max-w-[540px] flex-col gap-5">
          <span className="inline-flex w-fit items-center rounded-pill border border-gcw-line bg-white px-3 py-1 text-[13px] font-medium tracking-[0.2px] text-gcw-ink">
            The Workflow
          </span>
          <h2 className="font-heading text-[36px] font-medium leading-[1.15] tracking-[-1.2px] text-gcw-ink md:text-[48px] md:tracking-[-1.6px]">
            Built on deep research, not guesswork.
          </h2>
          <p className="max-w-[480px] text-[16px] leading-[1.65] text-gcw-muted md:text-[17px]">
            Every topic Geek Content Workflow suggests comes with competitive gap analysis,
            search intent, keyword targets, and strategic angles already mapped.
            Hit generate and start writing.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="flex w-full max-w-[420px] items-center gap-6 rounded-[28px] bg-gcw-ink px-6 py-7 sm:gap-8 sm:px-8 sm:py-8">
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div
                className="relative size-[88px] rounded-full"
                style={{
                  background:
                    "conic-gradient(#a78bfa 0deg 72deg, #27272a 72deg 360deg)",
                }}
                aria-hidden
              >
                <div className="absolute inset-[6px] rounded-full bg-gcw-ink" />
              </div>
              <p className="text-[12px] font-medium tracking-[0.2px] text-gcw-zinc-soft">
                Analyzing company...
              </p>
            </div>

            <ul className="flex min-w-0 flex-1 flex-col gap-2">
              {WORKFLOW_PILLS.map(({ label, icon: Icon }, i) => (
                <li
                  key={label}
                  className={`flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-[13px] font-medium tracking-[0.2px] ${
                    i % 2 === 0
                      ? "border-white/10 bg-white/5 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-200"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0 opacity-80" />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
