import type { ReactNode } from "react";
import {
  flattenDocumentText,
  parseContentDocument,
  type ContentParagraph,
  type ContentSection,
} from "@/lib/content-document";

function Runs({
  runs,
}: {
  runs?: { text?: string; bold?: boolean; italic?: boolean; linkUrl?: string }[];
}) {
  return (
    <>
      {(runs ?? []).map((run, i) => {
        const text = run.text ?? "";
        if (!text) return null;
        let node: ReactNode = text;
        if (run.bold) node = <strong>{node}</strong>;
        if (run.italic) node = <em>{node}</em>;
        if (run.linkUrl) {
          node = (
            <a href={run.linkUrl} className="underline" target="_blank" rel="noreferrer">
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function Paragraph({ p }: { p: ContentParagraph }) {
  if (p.$type === "text") {
    return (
      <p className="text-[15px] leading-relaxed text-gcw-ink">
        <Runs runs={p.runs} />
      </p>
    );
  }
  if (p.$type === "list") {
    const Tag = p.ordered ? "ol" : "ul";
    return (
      <Tag
        className={`space-y-1.5 text-[15px] leading-relaxed text-gcw-ink ${
          p.ordered ? "list-decimal pl-5" : "list-disc pl-5"
        }`}
      >
        {(p.items ?? []).map((item, i) => (
          <li key={i}>
            {typeof item === "string" ? (
              item
            ) : (
              <Runs runs={item} />
            )}
          </li>
        ))}
      </Tag>
    );
  }
  return null;
}

function SectionBlock({ section }: { section: ContentSection }) {
  return (
    <section className="space-y-3">
      {section.heading ? (
        <h3 className="font-heading text-lg font-medium tracking-tight">
          {section.heading}
        </h3>
      ) : null}
      <div className="space-y-3">
        {(section.paragraphs ?? []).map((p, i) => (
          <Paragraph key={i} p={p} />
        ))}
      </div>
      {(section.children ?? []).map((child, i) => (
        <div key={i} className="ml-3 border-l border-gcw-line pl-4">
          <SectionBlock section={child} />
        </div>
      ))}
    </section>
  );
}

export function ContentDocumentPreview({
  bodyDocumentJson,
  title = "Draft preview",
}: {
  bodyDocumentJson: string;
  title?: string;
}) {
  const doc = parseContentDocument(bodyDocumentJson);
  if (!doc) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Could not parse draft JSON for preview.
      </div>
    );
  }

  const plain = flattenDocumentText(doc);
  const hasContent =
    Boolean(doc.lede?.trim()) || (doc.sections && doc.sections.length > 0);

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-gcw-line bg-white p-5 text-sm text-gcw-muted">
        This version has no readable content yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gcw-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-medium">{title}</h2>
        {plain ? (
          <details className="text-xs text-gcw-zinc">
            <summary className="cursor-pointer hover:text-gcw-ink">
              Copy as plain text
            </summary>
            <textarea
              readOnly
              rows={8}
              className="mt-2 w-full rounded-lg border border-gcw-line px-3 py-2 font-mono text-xs"
              value={plain}
            />
          </details>
        ) : null}
      </div>
      {doc.lede ? (
        <p className="mt-4 text-[16px] leading-relaxed text-gcw-ink">
          {doc.lede}
        </p>
      ) : null}
      <div className="mt-6 space-y-8">
        {(doc.sections ?? []).map((section, i) => (
          <SectionBlock key={i} section={section} />
        ))}
      </div>
    </div>
  );
}

/** Compact preview for pack result lists. */
export function ContentDocumentExcerpt({
  bodyDocumentJson,
  maxChars = 220,
}: {
  bodyDocumentJson: string;
  maxChars?: number;
}) {
  const doc = parseContentDocument(bodyDocumentJson);
  if (!doc) return <span className="text-gcw-muted">No preview</span>;
  const plain = flattenDocumentText(doc).replace(/\s+/g, " ").trim();
  if (!plain) return <span className="text-gcw-muted">Empty draft</span>;
  const excerpt =
    plain.length > maxChars ? `${plain.slice(0, maxChars - 1)}…` : plain;
  return <span className="text-gcw-muted">{excerpt}</span>;
}
