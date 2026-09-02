import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticeChapterNavigation } from "../components/PracticeChapterNavigation";
import { catalog } from "../lib/catalog";

describe("practice chapter navigation", () => {
  it("links to adjacent chapters and identifies the current catalogue position", () => {
    const chapter = catalog.chapters[1];
    const html = renderToStaticMarkup(<PracticeChapterNavigation chapter={chapter} chapters={catalog.chapters} onNavigate={() => undefined} />);

    expect(html).toContain('aria-label="Practice chapter navigation"');
    expect(html).toContain(`Chapter 2 of ${catalog.chapters.length}`);
    expect(html).toContain(`href="/practice?chapter=${catalog.chapters[0].slug}"`);
    expect(html).toContain(`href="/practice?chapter=${catalog.chapters[2].slug}"`);
    expect(html).toContain("Previous chapter");
    expect(html).toContain("Next chapter");
  });

  it("disables previous navigation at the start of the catalogue", () => {
    const html = renderToStaticMarkup(<PracticeChapterNavigation chapter={catalog.chapters[0]} chapters={catalog.chapters} onNavigate={() => undefined} />);

    expect(html).toContain("disabled");
    expect(html).toContain(`href="/practice?chapter=${catalog.chapters[1].slug}"`);
  });
});
