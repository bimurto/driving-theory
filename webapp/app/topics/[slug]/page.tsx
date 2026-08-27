import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chapterBySlug, catalog } from "@/lib/catalog";
export function generateStaticParams() { return catalog.chapters.map((chapter) => ({ slug: chapter.slug })); }
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const chapter = chapterBySlug((await params).slug);
  if (!chapter) return <section className="content"><h1>Chapter not found</h1></section>;
  const toc = chapter.summary?.match(/^## (.+)$/gm)?.map((heading) => heading.slice(3)) ?? [];
  return <section className="content page-content guide"><Link className="button secondary topics-link" href="/topics">← Back to topics</Link><p className="eyebrow">{chapter.themeName}</p><h1>{chapter.chapterNumber} — {chapter.chapterName}</h1><p className="lede">{chapter.questions.length} Class B questions in this chapter.</p><Link className="button" href={`/practice?chapter=${chapter.slug}`}>Practise this chapter</Link>{chapter.summary ? <div className="guide-body"><aside className="guide-toc"><strong>In this guide</strong><nav aria-label="Guide sections"><ul>{toc.map((heading) => <li key={heading}><a href={`#${slugify(heading)}`}>{heading}</a></li>)}</ul></nav></aside><article className="summary"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ h2: ({ children }) => <h2 id={slugify(String(children))}>{children}</h2>, h3: ({ children }) => <h3 id={slugify(String(children))}>{children}</h3> }}>{chapter.summary}</ReactMarkdown></article></div> : <p className="notice">This chapter can be practised now; its study guide is being prepared.</p>}</section>;
}
