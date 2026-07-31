"use client";

import Link from "next/link";
import { GcwLogoMark, ChevronDownIcon } from "@/components/icons";
import { CtaButton } from "@/components/CtaButton";
import { SIGN_IN, SIGN_UP } from "@/data/content";
import { cn } from "@/lib/utils";

const NAV_CTA = SIGN_UP;

const centerLinks = [
  { label: "Features", href: "#how-it-works", chevron: true },
  { label: "Explore", href: "#blog", chevron: true },
  { label: "Pricing", href: "#", chevron: false },
  { label: "Academy", href: "#", chevron: false, badge: "New" },
] as const;

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-[9] w-full px-[15px] pt-5">
      <nav
        className={cn(
          "relative mx-auto flex h-[66px] w-full max-w-[1200px] items-center justify-between rounded-pill px-5 py-[15px]",
          "bg-[rgba(250,250,250,0.75)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),0_8px_24px_-8px_rgba(9,9,11,0.24)] backdrop-blur-[10px]",
        )}
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-gcw-ink"
          aria-label="Geek Content Workflow home"
        >
          <GcwLogoMark className="h-[31px] w-[29px]" />
          <span className="font-heading text-[29px] font-semibold leading-none tracking-tight">
            Geek Content Workflow
          </span>
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 min-[811px]:flex">
          {centerLinks.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="inline-flex items-center gap-1 text-[14px] font-medium tracking-[0.42px] text-gcw-muted transition-colors hover:text-gcw-ink"
              >
                {item.label}
                {"chevron" in item && item.chevron ? (
                  <ChevronDownIcon className="size-3.5 text-gcw-muted" />
                ) : null}
                {"badge" in item && item.badge ? (
                  <span className="ml-0.5 rounded-[4px] bg-gcw-surface px-1.5 py-px text-[10px] font-medium tracking-[0.3px] text-gcw-zinc">
                    {item.badge}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <a
            href={SIGN_IN}
            className="hidden text-[14px] font-medium tracking-[0.42px] text-gcw-muted transition-colors hover:text-gcw-ink min-[811px]:inline"
          >
            Sign In
          </a>
          <CtaButton href={NAV_CTA}>Get Started Free</CtaButton>
        </div>
      </nav>
    </header>
  );
}
