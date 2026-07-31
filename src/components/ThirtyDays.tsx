"use client";

import { useState } from "react";
import { CtaButton } from "@/components/CtaButton";
import { timelineColumns } from "@/data/content";
import { cn } from "@/lib/utils";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

export function ThirtyDays() {
  const [activeId, setActiveId] = useState(timelineColumns[0].id);

  return (
    <section className="px-5 py-16 md:py-24">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-10 md:gap-14">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="font-heading max-w-[640px] text-[32px] font-medium leading-[1.2] tracking-[-1px] text-gcw-ink md:text-[40px] md:tracking-[-1.4px]">
            Here&apos;s what you can get done with Geek Content Workflow in just 30 days.
          </h2>
          <CtaButton href="#">See Pricing</CtaButton>
        </div>

        <div className="w-full">
          <div className="relative mb-8">
            <div
              className="absolute top-[calc(50%+14px)] right-[16.66%] left-[16.66%] h-px bg-gcw-line"
              aria-hidden
            />
            <div className="relative grid grid-cols-3 gap-3">
              {timelineColumns.map((col) => {
                const active = col.id === activeId;
                return (
                  <div key={col.id} className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveId(col.id)}
                      className={cn(
                        "rounded-[10px] px-3 py-1.5 text-[13px] font-semibold tracking-[0.2px] transition-colors md:px-4 md:text-[14px]",
                        active
                          ? "bg-gcw-ink text-white"
                          : "bg-gcw-surface text-gcw-muted hover:text-gcw-ink",
                      )}
                      aria-pressed={active}
                    >
                      {col.label}
                    </button>
                    <span
                      className={cn(
                        "size-2 rounded-full border border-gcw-line bg-white",
                        active && "border-gcw-ink bg-gcw-ink",
                      )}
                      aria-hidden
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {timelineColumns.map((col) => {
              const active = col.id === activeId;
              return (
                <article
                  key={col.id}
                  className={cn(
                    "rounded-[24px] border bg-white p-6 transition-all md:p-7",
                    active
                      ? "border-gcw-ink/20 shadow-[0_8px_24px_-12px_rgba(9,9,11,0.18)]"
                      : "border-gcw-line opacity-70",
                  )}
                >
                  <h3 className="font-heading mb-5 text-[18px] font-medium tracking-[-0.3px] text-gcw-ink md:text-[20px]">
                    {col.heading}
                  </h3>
                  <ul className="flex flex-col gap-3.5">
                    {col.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-gcw-muted"
                      >
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-gcw-zinc" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
