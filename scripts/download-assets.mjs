import { mkdir, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { dirname, join, extname } from "node:path";
import { Readable } from "node:stream";

const assets = [
  // Favicons / SEO
  {
    url: "https://framerusercontent.com/images/9RviuUIodHAtlkHuVc66ZIL2Y.png",
    path: "public/seo/favicon.png",
  },
  {
    url: "https://framerusercontent.com/images/Hg7ldfJMnNSbU6aRZczywoMQdg4.png",
    path: "public/seo/apple-touch-icon.png",
  },
  {
    url: "https://framerusercontent.com/images/p4lzFOY4SgUzCyAQtrh2ykDHw.png",
    path: "public/seo/icon.png",
  },
  {
    url: "https://framerusercontent.com/images/TeRQLYirgMZtcihGYH4Gio3q8g.png",
    path: "public/seo/og-image.png",
  },
  // Fonts
  {
    url: "https://www.geekatyourspot.com/fonts/BrandText-Subset.woff2",
    path: "public/fonts/BrandText-Subset.woff2",
  },
  // Hero inline icons
  {
    url: "https://framerusercontent.com/images/WgUTsOIiWzQu72aWsFRAsAcdXE.png?width=321&height=320",
    path: "public/images/hero-icon-gcw.png",
  },
  {
    url: "https://framerusercontent.com/images/ujhmIAihYGgD5dIzePI1srEiM.png?width=2048&height=2048",
    path: "public/images/hero-icon-google.png",
  },
  {
    url: "https://framerusercontent.com/images/aZd9ilyQYD4GdQZmvyi9bCBlfZ8.webp?width=980&height=980",
    path: "public/images/hero-icon-openai.webp",
  },
  {
    url: "https://framerusercontent.com/images/prjtESXBNl2A36xtgp7G5T5JAk.png?width=159&height=159",
    path: "public/images/hero-icon-rocket.png",
  },
  // Product screen / integrations
  {
    url: "https://framerusercontent.com/images/kiBFTgCyMkfwlXI8YcYz6rXrQ.jpg?width=6000&height=4000",
    path: "public/images/product-editor.jpg",
  },
  {
    url: "https://framerusercontent.com/images/8lTAWk6kKFN30F96y2FHYIVlo.png?width=852&height=850",
    path: "public/images/integration-framer.png",
  },
  {
    url: "https://framerusercontent.com/images/IujwPM0jk7fB7IPOC6AA7XThs.png?width=512&height=512",
    path: "public/images/integration-gsc.png",
  },
  {
    url: "https://framerusercontent.com/images/zUxvnvg7kiJR29TQ3Kc4OZR5q4.png?width=512&height=512",
    path: "public/images/integration-wordpress.png",
  },
  {
    url: "https://framerusercontent.com/images/9YpAIaMdLANhOQSMMXXOEj6krdw.png?width=623&height=620",
    path: "public/images/integration-ga.png",
  },
  {
    url: "https://framerusercontent.com/images/YCGhTfElJVFrHX017dT4vX2xQrM.png?width=304&height=278",
    path: "public/images/integration-webhooks.png",
  },
  // Feature / workflow
  {
    url: "https://framerusercontent.com/images/NybpeSLciDvAFLMLOSiMvbh9cRg.png?width=1676&height=724",
    path: "public/images/feature-brand-core.png",
  },
  {
    url: "https://framerusercontent.com/images/SL5imeVV2vvpBWUaJF9XXpsg.jpg?width=4950&height=2784",
    path: "public/images/stats-bg.jpg",
  },
  {
    url: "https://framerusercontent.com/images/KakaX9ktuDMZEuKpSLIhIklkg.png?width=2039&height=1080",
    path: "public/images/cta-engine.png",
  },
  // Blog authors / cards
  {
    url: "https://framerusercontent.com/images/6WQGb6WIfb4Qy9k45MzwZzdm5E.jpg?width=4160&height=6240",
    path: "public/images/blog-1.jpg",
  },
  {
    url: "https://framerusercontent.com/images/T6ZnxKc6rSjh7tyAKuaK5xPw.jpg?width=4903&height=6129",
    path: "public/images/blog-2.jpg",
  },
  {
    url: "https://framerusercontent.com/images/Mkc6Jyg1kSHuclz7Pts3yyoY.jpg?width=5088&height=3392",
    path: "public/images/blog-3.jpg",
  },
  {
    url: "https://framerusercontent.com/images/CjXkRE2cX1oBnWvPkTr1HWoNARk.jpg?width=2719&height=3625",
    path: "public/images/blog-4.jpg",
  },
  {
    url: "https://framerusercontent.com/images/7nCfQLz8HpU4iOM0zjUlFx7bM.jpg?width=4000&height=6000",
    path: "public/images/blog-5.jpg",
  },
  {
    url: "https://framerusercontent.com/images/rgGUgYFWkHyeU9xD2b7ka1arg.jpg?width=6000&height=4000",
    path: "public/images/blog-6.jpg",
  },
  {
    url: "https://framerusercontent.com/images/UwUpWdPdFfvwUjW80VkYfapjg.svg",
    path: "public/images/arrow-up-right.svg",
  },
  {
    url: "https://framerusercontent.com/images/8AdYaVn3hwjEj3E0XuhtwBvrg4.png?width=32768&height=3087",
    path: "public/images/footer-marquee.png",
  },
  // Videos
  {
    url: "https://framerusercontent.com/assets/gXaFWt0wHwOBVUT2tFUh4hqM7mw.mp4",
    path: "public/videos/hero-particles.mp4",
  },
  {
    url: "https://framerusercontent.com/assets/UIkQgM0lc1NMkgohPF659VJo0E.webm",
    path: "public/videos/feature.webm",
  },
  {
    url: "https://framerusercontent.com/images/QETbdHCSQ2bKKq1XuoiSTgh0Yr4.png?width=1718&height=893",
    path: "public/images/feature-poster.png",
  },
];

async function downloadOne({ url, path }) {
  await mkdir(dirname(path), { recursive: true });
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GeekContentWorkflow/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path, buf);
  return { path, bytes: buf.length };
}

async function runBatch(items, concurrency = 4) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        const r = await downloadOne(item);
        console.log(`OK ${r.path} (${r.bytes} bytes)`);
        results.push({ ...item, ok: true, ...r });
      } catch (err) {
        console.error(`FAIL ${item.path}: ${err.message}`);
        results.push({ ...item, ok: false, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

const results = await runBatch(assets);
const ok = results.filter((r) => r.ok).length;
console.log(`\nDone: ${ok}/${results.length} succeeded`);
await writeFile(
  "docs/research/assets-manifest.json",
  JSON.stringify(results, null, 2),
);
