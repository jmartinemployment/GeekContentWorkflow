export type FeatureTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type BlogPost = {
  title: string;
  href: string;
  image: string;
};

export type TimelineColumn = {
  id: string;
  label: string;
  heading: string;
  items: string[];
};

/** App auth — GeekOAuth PKCE start. */
export const SIGN_UP = "/api/auth/start";
export const SIGN_IN = "/api/auth/start";
export const DEMO = "/app";

export const featureTabs: FeatureTab[] = [
  {
    id: "brand-core",
    label: "Brand Core",
    title: "Brand Intelligence",
    description:
      "Teach Geek Content Workflow your business once—company, ICP, competitors, voice. Every draft is aligned to your brand.",
    image: "/images/feature-brand-core.png",
  },
  {
    id: "strategy-map",
    label: "Strategy Map",
    title: "Content Strategy Map",
    description:
      "A living content plan, built from your brand. Geek Content Workflow maps the pillars, focus areas, topics, and keywords worth pursuing.",
    image: "/images/feature-strategy-map.png",
  },
  {
    id: "ai-drafting",
    label: "AI Drafting",
    title: "AI Drafting",
    description:
      "Skip the blank page. Geek Content Workflow delivers a brand-aware first draft you & your team can shape with real-time edits.",
    image: "/images/feature-ai-drafting.png",
  },
  {
    id: "cms-publish",
    label: "CMS Publish",
    title: "Publishing Integrations",
    description:
      "Plan, schedule & finished content straight to your CMS. No copy-paste, no formatting cleanup.",
    image: "/images/feature-cms-publish.png",
  },
  {
    id: "site-analytics",
    label: "Site Analytics",
    title: "Performance Metrics",
    description:
      "See how every piece of content is scaling your visibility. Geek Content Workflow analyzes performance, spots opportunities, and queues new content recommendations.",
    image: "/images/feature-site-analytics.png",
  },
];

export const howItWorksSteps = [
  {
    title: "Built around your brand",
    body: "Geek Content Workflow researches & learns your business, voice, and competitors in minutes.",
  },
  {
    title: "Integrate with analytics & website CMS",
    body: "Geek Content Workflow pulls the data in and publishes straight to your site.",
  },
  {
    title: "Draft content on autopilot",
    body: "Geek Content Workflow drafts your blogs, articles, and thought leadership in your voice. You review, refine, and publish.",
  },
  {
    title: "Content that generates leads",
    body: "Watch your research-backed and SEO/GEO optimized content drive your business growth",
  },
];

export const timelineColumns: TimelineColumn[] = [
  {
    id: "today",
    label: "Today",
    heading: "Get started",
    items: [
      "Train Geek Content Workflow on your brand and ICPs",
      "Build your content plan automatically",
      "Fill your queue before you finish your coffee",
    ],
  },
  {
    id: "week",
    label: "Week in",
    heading: "Get Moving",
    items: [
      "Publish your first pieces to your CMS",
      "Show up where your buyers are searching",
      "Watch Geek Content Workflow optimize your strategy",
    ],
  },
  {
    id: "month",
    label: "Month in",
    heading: "Wonder How You Ran Marketing Without Geek Content Workflow",
    items: [
      "Compound your visibility week over week",
      "Capture demand in Google and AI search",
      "Take a nice long breath and relax",
    ],
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "What is Geek Content Workflow?",
    answer:
      "Geek Content Workflow is an AI-powered content marketing workflow that handles everything from strategy to publishing. You onboard your brand once, Geek Content Workflow researches trends and competitor content, queues key topics, drafts SEO & GEO-optimized content, and publishes to your CMS—with human review at every step that matters.",
  },
  {
    question: "How is this different from ChatGPT or other AI writing tools?",
    answer:
      "Generic AI tools start from scratch every time. Geek Content Workflow learns your brand, audience, and competitors during onboarding—then uses that context for every piece of content. Plus, it handles the full workflow: research, drafting, editing, publishing, analytics and optimization. Not just the writing.",
  },
  {
    question: "Do I need content marketing experience to use Geek Content Workflow?",
    answer:
      "No. Geek Content Workflow is built for founders and small teams who don't have time to become content marketers. It generates your strategy, queues topics, and writes the first drafts. You just review, tweak, and approve.",
  },
  {
    question: "How does the content get optimized for SEO and AI citations?",
    answer:
      "Every piece is structured using best practices for Google rankings and LLM citations—FAQ sections, clear headings, authoritative sources, and entity-rich formatting. Geek Content Workflow handles this automatically so your content gets found on search engines and quoted by tools like ChatGPT and Perplexity.",
  },
  {
    question: "Can I collaborate with my team?",
    answer:
      "Yes. Geek Content Workflow includes a shared editing canvas where you can leave comments, tag teammates, and refine drafts together before publishing.",
  },
  {
    question: "How long does it take to get started?",
    answer:
      "Most users are fully onboarded in under 30 minutes. Once you plug in your brand, audience, and goals, Geek Content Workflow builds your content plan and you can start creating the same day. No lengthy setup. No waiting on a strategist. You're up and running fast.",
  },
  {
    question: "What kind of results can I expect?",
    answer:
      "That depends on where you're starting, but our workflow is built for compounding growth. We used this exact system to grow our own traffic over 6,000% in six months. Most users see increased content output within the first week and measurable traffic and engagement gains within 60–90 days of consistent publishing.",
  },
  {
    question: "Is this for B2B or B2C companies?",
    answer:
      "Both. Geek Content Workflow works for any brand that needs to publish quality content consistently. That said, we're especially popular with B2B startups—founders and small marketing teams who need to scale content without scaling headcount.",
  },
];

export const blogPosts: BlogPost[] = [
  {
    title:
      "We Analyzed 1,521 Real B2B SaaS Queries. The Better AI Search Understands the Question, the Less Anyone Clicks.",
    href: "#",
    image: "/images/blog-1.jpg",
  },
  {
    title:
      "We Ran 50 B2B SaaS Queries Through Google AI Mode. It Cited 23 Sources Per Answer.",
    href: "#",
    image: "/images/blog-2.jpg",
  },
  {
    title:
      "We Got Hit by the May 2026 Google Core Update. It Was the Best Thing to Happen to Our Content Strategy.",
    href: "#",
    image: "/images/blog-3.jpg",
  },
  {
    title:
      "What Actually Gets Cited by AI: We Tested the GEO Playbook on 12 Million of Our Own Impressions",
    href: "#",
    image: "/images/blog-4.jpg",
  },
  {
    title:
      "Google's AI Search Overhaul Added 5 Things. Only 2 Change Your Content.",
    href: "#",
    image: "/images/blog-5.jpg",
  },
  {
    title: "Why Selection Beats Visibility in the Agentic Web",
    href: "#",
    image: "/images/blog-6.jpg",
  },
];

export const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Brand Core", href: "#" },
      { label: "Strategy Map", href: "#" },
      { label: "AI Drafting", href: "#" },
      { label: "Analytics", href: "#" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Case Studies", href: "#" },
      { label: "Resources", href: "#" },
      { label: "Community", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Blog", href: "#blog" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Don't Feed The Algorithm", href: "#" },
    ],
  },
];
