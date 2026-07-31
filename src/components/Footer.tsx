import Image from "next/image";
import { GcwLogoMark } from "@/components/icons";
import { CtaButton } from "@/components/CtaButton";
import { footerColumns, SIGN_UP } from "@/data/content";

export function Footer() {
  return (
    <footer className="w-full bg-gcw-bg px-4 pb-4 md:px-6 md:pb-6">
      <div className="mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] bg-gcw-ink text-white md:rounded-[40px]">
        <div className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0">
            <Image
              src="/images/footer-marquee.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center opacity-40"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gcw-ink/40 via-gcw-ink/75 to-gcw-ink" />
          </div>

          <div className="relative flex flex-col items-center gap-5 px-6 py-16 text-center md:gap-6 md:px-10 md:py-20">
            <h2 className="font-heading text-[36px] font-medium leading-none tracking-[-0.04em] md:text-[52px]">
              Try Geek Content Workflow Now
            </h2>
            <CtaButton
              href={`${SIGN_UP}?cta_source=gcw-footer`}
              variant="light"
            >
              Start For Free
            </CtaButton>
          </div>
        </div>

        <div className="px-6 py-12 md:px-10 md:py-16 lg:px-14">
          <div className="mb-12 flex items-center gap-2.5 md:mb-14">
            <GcwLogoMark className="h-[22px] w-auto" fill="#ffffff" />
            <span className="font-heading text-[20px] font-medium tracking-[-0.03em]">
              Geek Content Workflow
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 md:gap-x-12">
            {footerColumns.map((column) => (
              <div key={column.title} className="flex flex-col gap-4">
                <p className="text-[14px] font-semibold tracking-[0.01em] text-white">
                  {column.title}
                </p>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[14px] leading-[1.4] text-white/65 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-[13px] text-white/70 sm:mt-16 sm:flex-row sm:items-center sm:justify-between md:pt-8">
            <p>
              <span className="font-medium text-white">Geek Content Workflow, Inc.™</span> All
              rights reserved
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a
                href="https://www.geekatyourspot.com/terms"
                className="transition-colors hover:text-white"
              >
                Terms & Conditions
              </a>
              <a
                href="https://www.geekatyourspot.com/privacy"
                className="transition-colors hover:text-white"
              >
                Privacy & Security
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
