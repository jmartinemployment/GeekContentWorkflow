import Image from "next/image";
import { CtaButton } from "@/components/CtaButton";
import { DEMO, SIGN_UP } from "@/data/content";

const CTA_SIGN_UP = `${SIGN_UP}?cta_source=gcw-homepage-engine`;

export function CtaEngine() {
  return (
    <section className="px-5 py-16 md:py-24">
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-8 text-center md:gap-10">
        <div className="relative w-full max-w-[720px] overflow-hidden rounded-[28px]">
          <Image
            src="/images/cta-engine.png"
            alt=""
            width={1200}
            height={675}
            className="h-auto w-full object-cover"
            priority={false}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-gcw-bg to-transparent"
            aria-hidden
          />
        </div>

        <h2 className="font-heading max-w-[720px] text-[36px] font-medium leading-[1.15] tracking-[-1.2px] text-gcw-ink md:text-[48px] md:tracking-[-1.6px]">
          Your marketing deserves an engine, not a to-do list.
        </h2>

        <p className="max-w-[520px] text-[16px] leading-[1.6] text-gcw-muted md:text-[17px]">
          Set up in minutes. Publish seamlessly. Grow while you focus on
          product.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <CtaButton href={CTA_SIGN_UP} variant="dark">
            Start Creating
          </CtaButton>
          <CtaButton
            href={DEMO}
            variant="ghost"
            className="border border-gcw-line bg-white"
          >
            Book a Demo
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
