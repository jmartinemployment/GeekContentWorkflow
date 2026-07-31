"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { faqItems } from "@/data/content";
import { cn } from "@/lib/utils";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      id="faq"
      className="w-full bg-gcw-bg px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto flex w-full max-w-[820px] flex-col items-center gap-10 md:gap-14">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-[13px] font-medium tracking-[0.02em] text-gcw-zinc">
            FAQs
          </p>
          <h2 className="font-heading max-w-[640px] text-[28px] font-medium leading-[1.2] tracking-[-0.04em] text-gcw-ink md:text-[40px] md:leading-[1.15]">
            Answers to your common AI Content Marketing questions
          </h2>
        </div>

        <div className="w-full border-t border-gcw-line">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="border-b border-gcw-line"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenIndex((current) => (current === index ? -1 : index))
                  }
                  className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left md:py-[18px]"
                >
                  <span
                    className={cn(
                      "text-[15px] font-medium leading-[1.4] tracking-[-0.01em] transition-colors md:text-[16px]",
                      isOpen ? "text-gcw-ink" : "text-gcw-ink-soft",
                    )}
                  >
                    {item.question}
                  </span>
                  <span className="shrink-0 text-gcw-zinc">
                    {isOpen ? (
                      <MinusIcon className="size-4" />
                    ) : (
                      <PlusIcon className="size-4" />
                    )}
                  </span>
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-10 text-[15px] leading-[1.65] text-gcw-muted md:pb-6 md:text-[16px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
