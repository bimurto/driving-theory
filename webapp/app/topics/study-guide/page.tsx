import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const guidePath = path.join(process.cwd(), "..", "CLASS_B_THEORY_STUDY_GUIDE.md");
const guide = fs.readFileSync(guidePath, "utf8");
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const headings = guide.match(/^## (.+)$/gm)?.map((heading) => heading.slice(3)).filter((heading) => heading !== "Table of contents") ?? [];

export const metadata = {
  title: "Class B Theory Study Guide — RoadReady",
  description: "A complete, practical guide to German Class B driving theory.",
};

export default function FullStudyGuidePage() {
  return <section className="content page-content guide">
    <Link className="button secondary topics-link" href="/topics/">← Back to topics</Link>
    <p className="eyebrow">Complete study guide</p>
    <div className="guide-body">
      <details className="guide-toc" open>
        <summary>In this guide</summary>
        <nav aria-label="Guide sections">
          <ul>{headings.map((heading) => <li key={heading}><a href={`#${slugify(heading)}`}>{heading}</a></li>)}</ul>
        </nav>
      </details>
      <article className="summary">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          h1: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
          h2: ({ children }) => <h2 className="guide-section-heading" id={slugify(String(children))}>{children}</h2>,
          h3: ({ children }) => <h3 className={String(children) === "Common exam traps" ? "exam-traps-heading" : undefined} id={slugify(String(children))}>{children}</h3>,
          blockquote: ({ children }) => <blockquote className="guide-callout">{children}</blockquote>,
          table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
        }}>{guide}</ReactMarkdown>
      </article>
    </div>
  </section>;
}
