import Image from "next/image";
import { howItWorksSteps } from "@/data/content";

const integrationIcons = [
  { src: "/images/integration-framer.png", alt: "Framer" },
  { src: "/images/integration-gsc.png", alt: "Google Search Console" },
  { src: "/images/integration-wordpress.png", alt: "WordPress" },
  { src: "/images/integration-ga.png", alt: "Google Analytics" },
  { src: "/images/integration-webhooks.png", alt: "Webhooks" },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-gcw-bg px-5 py-16 md:px-8 md:py-20"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-center">
        <div className="mb-4 inline-flex items-center rounded-[7px] bg-white px-3 py-1 shadow-[0_2px_5px_rgba(0,0,0,0)]">
          <span className="text-[14px] font-medium tracking-[0.42px] text-gcw-ink">
            The Content Engine
          </span>
        </div>

        <h2 className="font-heading mb-10 text-center text-[40px] font-medium tracking-[-1.6px] text-gcw-ink md:mb-12 md:text-[48px] md:tracking-[-1.92px]">
          How Geek Content Workflow Works
        </h2>

        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ol className="relative mx-auto w-full max-w-[515px] lg:mx-0 lg:justify-self-end">
            {howItWorksSteps.map((step, index) => {
              const isLast = index === howItWorksSteps.length - 1;
              const showIntegrations = index === 1;

              return (
                <li
                  key={step.title}
                  className="relative flex gap-4 pb-8 last:pb-0 md:gap-5 md:pb-10"
                >
                  <div className="relative flex w-[17px] shrink-0 flex-col items-center">
                    {!isLast || showIntegrations ? (
                      <span
                        aria-hidden
                        className="absolute top-[27px] bottom-0 w-0.5 bg-zinc-700"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className="relative z-10 mt-2.5 size-[17px] shrink-0 rounded-full bg-zinc-700"
                    />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <h5 className="text-[18px] font-semibold tracking-[-0.54px] text-gcw-ink-soft md:text-[20px] md:tracking-[-0.6px]">
                      {step.title}
                    </h5>
                    <p className="mt-1.5 text-[16px] leading-[1.55] tracking-[-0.32px] text-gcw-muted md:text-[18px] md:leading-[1.55] md:tracking-[-0.36px]">
                      {step.body}
                    </p>

                    {showIntegrations ? (
                      <div className="mt-3 flex items-center gap-2.5">
                        {integrationIcons.map((icon) => (
                          <Image
                            key={icon.src}
                            src={icon.src}
                            alt={icon.alt}
                            width={31}
                            height={31}
                            className="size-[31px] object-contain"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <div
            aria-hidden
            className="relative hidden min-h-[320px] lg:block"
          >
            <div className="absolute inset-y-8 left-1/3 w-px bg-gradient-to-b from-transparent via-gcw-line to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
