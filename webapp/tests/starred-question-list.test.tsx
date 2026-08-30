import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StarredQuestionListContent, starredQuestions } from "../components/StarredQuestionList";
import { allQuestions } from "../lib/catalog";
import { initialProgress, setStarRating } from "../lib/progress";

describe("starred question list", () => {
  it("explains how to add star ratings when there are no matching theory questions", () => {
    const html = renderToStaticMarkup(<StarredQuestionListContent progress={initialProgress()} />);

    expect(html).toContain("No starred questions here yet");
    expect(html).toContain("Set a 1–3-star revision priority");
    expect(html).toContain('href="/practice"');
  });

  it("filters theory questions by star level and starts revision from the list", () => {
    const oneStar = allQuestions[0];
    const threeStar = allQuestions[1];
    let progress = setStarRating(initialProgress(), oneStar.id, 1, new Date("2026-08-28T08:00:00Z"));
    progress = setStarRating(progress, threeStar.id, 3, new Date("2026-08-28T08:00:00Z"));

    expect(starredQuestions(progress, 1)).toEqual([oneStar]);
    const html = renderToStaticMarkup(<StarredQuestionListContent progress={progress} />);
    expect(html).toContain('href="/practice?stars=all"');
    expect(html).toContain(`href="/practice?stars=all&amp;question=${oneStar.id}"`);
  });
});
