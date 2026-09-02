import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChapterCompletionDialog } from "../components/ChapterCompletionDialog";
import { catalog } from "../lib/catalog";

describe("chapter completion dialog", () => {
  it("recommends the next chapter guide while keeping review and catalogue alternatives visible", () => {
    const chapter = catalog.chapters[0];
    const nextChapter = catalog.chapters[1];
    const html = renderToStaticMarkup(<ChapterCompletionDialog
      chapter={chapter}
      completionKind="chapter-covered"
      recommendation={{ kind: "chapter", chapter: nextChapter, reason: "next" }}
      dueCount={3}
      onPractiseAgain={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Chapter covered");
    expect(html).toContain(`${nextChapter.chapterNumber} — ${nextChapter.chapterName}`);
    expect(html).toContain(`href="/topics/${nextChapter.slug}"`);
    expect(html).toContain('href="/practice?due=1"');
    expect(html).toContain('href="/topics"');
  });

  it("falls back to Progress when every chapter is covered", () => {
    const html = renderToStaticMarkup(<ChapterCompletionDialog
      chapter={catalog.chapters.at(-1)!}
      completionKind="chapter-covered"
      recommendation={{ kind: "all-covered" }}
      dueCount={0}
      onPractiseAgain={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain("Learning path covered");
    expect(html).toContain('href="/progress"');
    expect(html).not.toContain('href="/practice?due=1"');
  });

  it("labels a completed retry without claiming new chapter coverage", () => {
    const chapter = catalog.chapters[0];
    const html = renderToStaticMarkup(<ChapterCompletionDialog
      chapter={chapter}
      completionKind="practice-round"
      recommendation={{ kind: "chapter", chapter: catalog.chapters[1], reason: "next" }}
      dueCount={0}
      onPractiseAgain={() => undefined}
      onClose={() => undefined}
    />);

    expect(html).toContain("Practice round complete");
    expect(html).toContain("answered every question correctly again");
    expect(html).not.toContain(">Chapter covered<");
  });
});
