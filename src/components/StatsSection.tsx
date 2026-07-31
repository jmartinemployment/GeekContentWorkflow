import { CtaButton } from "@/components/CtaButton";
import { SIGN_UP } from "@/data/content";

const STATS_CTA = `${SIGN_UP}?cta_source=gcw-homepage-stats`;

const stats = [
  {
    label: "Startups With Blogs Generate:",
    value: "35%",
    detail: "more leads than those without.",
  },
  {
    label: "Publishing Content Weekly Drives:",
    value: "320%",
    detail: "more conversions than monthly",
  },
] as const;

export function StatsSection() {
  return (
    <section className="px-5 py-8 md:py-12">
      <div className="relative mx-auto w-full max-w-[1300px] overflow-hidden rounded-[40px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/stats-bg.jpg)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/55" aria-hidden />

        <div className="relative z-10 flex flex-col items-center gap-12 px-6 py-16 md:gap-16 md:px-16 md:py-24">
          <h2 className="font-heading text-center text-[32px] font-medium leading-tight tracking-[-1px] text-white md:text-[44px] md:tracking-[-1.4px]">
            Why content matters:
          </h2>

          <div className="grid w-full max-w-[1000px] gap-10 md:grid-cols-2 md:gap-8">
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="flex flex-col items-center gap-3 text-center text-white"
              >
                <p className="text-[15px] font-medium tracking-[0.2px] md:text-[16px]">
                  {stat.label}
                </p>
                <p className="font-heading text-[72px] font-medium leading-none tracking-[-2px] md:text-[88px] md:tracking-[-3px]">
                  {stat.value}
                </p>
                <p className="max-w-[280px] text-[14px] leading-relaxed text-white/80 md:text-[15px]">
                  {stat.detail}
                </p>
              </div>
            ))}
          </div>

          <CtaButton href={STATS_CTA} variant="light">
            Start Creating
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
