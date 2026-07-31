"use client";

import { useState } from "react";
import Image from "next/image";
import { CtaButton } from "@/components/CtaButton";
import {
  AiDraftingIcon,
  BrandCoreIcon,
  CmsPublishIcon,
  SiteAnalyticsIcon,
  StrategyMapIcon,
} from "@/components/icons";
import { featureTabs, SIGN_UP } from "@/data/content";
import { cn } from "@/lib/utils";

const tabIcons = {
  "brand-core": BrandCoreIcon,
  "strategy-map": StrategyMapIcon,
  "ai-drafting": AiDraftingIcon,
  "cms-publish": CmsPublishIcon,
  "site-analytics": SiteAnalyticsIcon,
} as const;

const exploreHrefs: Record<string, string> = {
  "brand-core": "#",
  "strategy-map": "#",
  "ai-drafting": "#",
  "cms-publish": "#",
  "site-analytics": "#",
};

export function FeatureSpread() {
  const [activeId, setActiveId] = useState(featureTabs[0].id);
  const [visible, setVisible] = useState(true);
  const active = featureTabs.find((tab) => tab.id === activeId) ?? featureTabs[0];

  function selectTab(id: string) {
    if (id === activeId) return;
    setVisible(false);
    window.setTimeout(() => {
      setActiveId(id);
      setVisible(true);
    }, 150);
  }

  return (
    <section
      id="features"
      className="bg-gcw-bg px-3 py-8 md:px-5 md:py-10"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1400px] flex-col items-center rounded-[24px] px-4 py-16 md:rounded-[32px] md:px-10 md:py-20",
          "bg-[linear-gradient(rgb(9,9,11)_89%,rgb(18,18,18)_100%)]",
        )}
      >
        <div className="mx-auto max-w-[740px] text-center">
          <h2 className="font-heading text-[32px] font-medium tracking-[-1.2px] text-white md:text-[44px] md:tracking-[-1.6px]">
            Features across the full workflow.
          </h2>
          <p className="mt-3 text-[16px] leading-7 text-zinc-100 md:text-[18px]">
            Geek Content Workflow is built for lean teams who want high growth.
          </p>
        </div>

        <div className="mt-10 flex w-full max-w-[1240px] justify-start overflow-x-auto md:mt-12 md:justify-center">
          <div
            role="tablist"
            aria-label="Product features"
            className="flex min-w-max items-center gap-3 px-1 md:gap-4"
          >
            {featureTabs.map((tab) => {
              const Icon = tabIcons[tab.id as keyof typeof tabIcons];
              const isActive = tab.id === activeId;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 text-[14px] transition-colors",
                    isActive
                      ? "border-white font-medium text-white"
                      : "border-transparent font-normal text-[#bfbfbf] hover:text-zinc-200",
                  )}
                >
                  {Icon ? <Icon className="size-4 shrink-0" /> : null}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid w-full max-w-[1240px] grid-cols-1 items-center gap-8 md:mt-10 md:grid-cols-2 md:gap-12">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={active.image}
              alt={active.title}
              width={1676}
              height={724}
              className="h-auto w-full rounded-2xl object-cover"
              sizes="(max-width: 768px) 100vw, 596px"
            />
          </div>

          <div
            className={cn(
              "flex flex-col items-start gap-4 transition-opacity duration-300 md:max-w-[520px]",
              visible ? "opacity-100" : "opacity-0",
            )}
          >
            <h3 className="font-heading text-[26px] font-medium tracking-[-1px] text-white md:text-[30px] md:tracking-[-1.2px]">
              {active.title}
            </h3>
            <p className="text-[16px] leading-7 text-gcw-zinc-soft md:text-[17px]">
              {active.description}
            </p>
            <CtaButton
              href={exploreHrefs[active.id] ?? "#"}
              variant="light"
              className="mt-1"
            >
              Explore Feature
            </CtaButton>
          </div>
        </div>

        <div className="mt-10 md:mt-12">
          <CtaButton href={SIGN_UP} variant="light">
            Start 14 day free trial
          </CtaButton>
        </div>
      </div>
    </section>
  );
}
