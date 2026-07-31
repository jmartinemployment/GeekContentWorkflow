"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { CtaButton } from "@/components/CtaButton";
import { SIGN_UP } from "@/data/content";

const HERO_CTA = SIGN_UP;

function InlineIcon({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="mx-1 inline-block align-middle rounded-[8px]"
      unoptimized
    />
  );
}

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.35 + 0.08,
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
    }));

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame() {
      if (!running || !canvas || !ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.fillStyle = `rgba(9, 9, 11, ${p.a})`;
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    resize();
    frame();
    window.addEventListener("resize", resize);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute bottom-[-112px] left-0 z-0 h-[722px] w-full"
      aria-hidden
    />
  );
}

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center gap-6 pb-[14px] pt-[190px]">
      <ParticleField />

      <div className="relative z-10 mx-auto w-full max-w-[1000px] px-5">
        <h1 className="font-heading mx-auto max-w-[924px] text-center text-[36px] font-medium leading-[1.35] tracking-[-1.2px] text-gcw-ink-soft sm:text-[44px] sm:tracking-[-1.5px] md:text-[50px] md:leading-[77.5px] md:tracking-[-1.75px]">
          Geek Content Workflow is the{" "}
          <InlineIcon
            src="/images/hero-icon-gcw.png"
            alt=""
            width={37}
            height={37}
          />{" "}
          AI Content Engine for startups.{" "}
          <InlineIcon
            src="/images/hero-icon-google.png"
            alt=""
            width={31}
            height={31}
          />{" "}
          Rank on Google,{" "}
          <InlineIcon
            src="/images/hero-icon-openai.webp"
            alt=""
            width={38}
            height={38}
          />{" "}
          get cited by AI, and{" "}
          <InlineIcon
            src="/images/hero-icon-rocket.png"
            alt=""
            width={25}
            height={25}
          />{" "}
          turn content into customers.
        </h1>
      </div>

      <CtaButton href={HERO_CTA} className="relative z-10">
        Start For Free
      </CtaButton>

      <a
        href="#product-screen"
        className="relative z-10 flex flex-col items-center gap-2 text-[10px] font-bold tracking-[2px] text-gcw-muted transition-opacity hover:opacity-80"
      >
        LEARN MORE
        <span className="block h-5 w-px bg-gcw-muted" aria-hidden />
      </a>
    </section>
  );
}
