import Image from "next/image";
import { ArrowUpRightIcon } from "@/components/icons";
import { blogPosts } from "@/data/content";

export function BlogSection() {
  return (
    <section
      id="blog"
      className="w-full bg-gcw-bg px-5 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-12 md:gap-16">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-[640px] flex-col gap-3">
            <p className="text-[13px] font-medium tracking-[0.02em] text-gcw-zinc">
              Articles
            </p>
            <h2 className="font-heading text-[32px] font-medium leading-[1.15] tracking-[-0.04em] text-gcw-ink md:text-[42px] md:leading-[1.1]">
              Resources to make content your biggest growth engine.
            </h2>
            <p className="max-w-[480px] text-[16px] leading-[1.55] text-gcw-muted">
              Learn from the Geek Content Workflow team to plan smarter, create more, and grow
              faster.
            </p>
          </div>

          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold tracking-[0.02em] text-gcw-ink transition-opacity hover:opacity-70"
          >
            Explore the blog
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {blogPosts.map((post) => (
            <a
              key={post.title}
              href={post.href}
              className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-gcw-surface md:rounded-[24px]">
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 p-4 text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-white md:p-5 md:text-[16px]">
                  {post.title}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
