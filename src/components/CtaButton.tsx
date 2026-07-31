import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@/components/icons";

type CtaButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: "dark" | "light" | "ghost";
  className?: string;
  showArrow?: boolean;
};

export function CtaButton({
  href,
  children,
  variant = "dark",
  className,
  showArrow = true,
}: CtaButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-[56px] px-4 py-2.25 pl-4 pr-3 text-[14px] font-semibold tracking-[0.42px] transition-opacity hover:opacity-90",
        variant === "dark" && "bg-gcw-ink text-white",
        variant === "light" &&
          "bg-white text-gcw-ink shadow-[0_0.6px_0.6px_-1.25px_rgba(9,9,11,0.11),0_2.29px_2.29px_-2.5px_rgba(9,9,11,0.1),0_10px_10px_-3.75px_rgba(9,9,11,0.04)]",
        variant === "ghost" && "bg-transparent text-gcw-ink",
        className,
      )}
    >
      <span>{children}</span>
      {showArrow ? <ArrowRightIcon className="size-3.5" /> : null}
    </a>
  );
}
