import { describe, expect, it } from "vitest";
import { resolveMarkdownImageUrl } from "../lib/markdown-image-url";

describe("resolveMarkdownImageUrl", () => {
  it("keeps summary images inside the GitHub Pages project path", () => {
    expect(resolveMarkdownImageUrl("/media/images/1_4_42-001.png", "/driving-theory"))
      .toBe("/driving-theory/media/images/1_4_42-001.png");
  });

  it("does not rewrite external image URLs", () => {
    expect(resolveMarkdownImageUrl("https://example.com/sign.png", "/driving-theory"))
      .toBe("https://example.com/sign.png");
  });
});
