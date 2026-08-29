import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const guidePath = path.join(process.cwd(), "..", "CLASS_B_THEORY_STUDY_GUIDE.md");
const guide = fs.readFileSync(guidePath, "utf8");
const start = guide.indexOf("## Quick exam cheat sheet");
if (start < 0) throw new Error("Quick exam cheat sheet section is missing from the study guide");
const cheatSheet = guide.slice(start);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const headings = cheatSheet.match(/^#{2,3} (.+)$/gm)?.map((heading) => heading.replace(/^#{2,3} /, "")) ?? [];

export const metadata = {
  title: "Quick Class B Exam Cheat Sheet — RoadReady",
  description: "Fast revision of the key German Class B driving theory rules.",
};

export default function CheatSheetPage() {
  return <section className="content page-content guide">
    <div className="guide-actions"><Link className="button secondary" href="/topics/">← Back to topics</Link><Link className="button secondary" href="/topics/study-guide/">Full study guide</Link></div>
    <p className="eyebrow">Fast revision</p>
    <div className="guide-body">
      <details className="guide-toc" open>
        <summary>Cheat sheet sections</summary>
        <nav aria-label="Cheat sheet sections">
          <ul>{headings.slice(1).map((heading) => <li key={heading}><a href={`#${slugify(heading)}`}>{heading}</a></li>)}</ul>
        </nav>
      </details>
      <article className="summary">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          h2: ({ children }) => <h1 id={slugify(String(children))}>{children}</h1>,
          h3: ({ children }) => <h2 className="guide-section-heading" id={slugify(String(children))}>{children}</h2>,
          blockquote: ({ children }) => <blockquote className="guide-callout">{children}</blockquote>,
          table: ({ children }) => <div className="markdown-table"><table>{children}</table></div>,
        }}>{cheatSheet}</ReactMarkdown>
      </article>
    </div>
  </section>;
}
