import Image from "next/image";
import { cn } from "@/lib/utils";

const badges = [
  {
    src: "/images/integration-framer.png",
    alt: "Framer",
    className: "top-[12%] left-[-2%] md:left-[-4%] size-11 md:size-14",
  },
  {
    src: "/images/integration-gsc.png",
    alt: "Google Search Console",
    className: "top-[8%] right-[6%] md:right-[2%] size-10 md:size-12",
  },
  {
    src: "/images/integration-wordpress.png",
    alt: "WordPress",
    className:
      "top-[42%] right-[-2%] md:right-[-5%] hidden size-11 sm:flex md:size-14",
  },
  {
    src: "/images/integration-ga.png",
    alt: "Google Analytics",
    className: "bottom-[18%] left-[2%] md:left-[-3%] size-10 md:size-12",
  },
  {
    src: "/images/integration-webhooks.png",
    alt: "Webhooks",
    className: "bottom-[10%] right-[10%] md:right-[6%] size-11 md:size-14",
  },
] as const;

export function ProductScreen() {
  return (
    <section
      id="product-screen"
      className="relative flex min-h-[560px] items-center justify-center bg-gcw-bg px-4 py-10 md:h-[768px] md:px-[15px] md:py-0 md:pb-[75px]"
    >
      <div className="relative w-full max-w-[1140px]">
        <div
          className={cn(
            "relative overflow-hidden rounded-[24px] bg-white p-2.5 md:rounded-[32px]",
            "shadow-[0_8px_24px_-10px_rgba(9,9,11,0.24)]",
          )}
        >
          <div className="relative aspect-[1180/673] overflow-hidden rounded-[20px] bg-[#f4f4f5] md:rounded-[24px]">
            <Image
              src="/images/product-editor.png"
              alt=""
              width={1180}
              height={673}
              className="absolute inset-0 z-0 h-full w-full object-cover"
              sizes="(max-width: 1140px) 100vw, 1140px"
              priority
              aria-hidden
            />
            <video
              className="absolute inset-0 z-10 h-full w-full object-cover"
              src="/videos/product-demo.mp4"
              poster="/images/product-editor.png"
              muted
              loop
              autoPlay
              playsInline
              aria-label="Geek Content Workflow product interface"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[28%]"
              style={{
                background:
                  "linear-gradient(transparent, rgb(249, 250, 251))",
              }}
            />
          </div>
        </div>

        {badges.map((badge) => (
          <div
            key={badge.src}
            className={cn(
              "absolute z-30 flex items-center justify-center rounded-2xl bg-white p-2",
              "shadow-[0_4px_16px_-4px_rgba(9,9,11,0.18),0_1px_2px_rgba(9,9,11,0.06)]",
              badge.className,
            )}
          >
            <Image
              src={badge.src}
              alt={badge.alt}
              width={40}
              height={40}
              className="size-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
