"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ChapterRecommendation } from "@/lib/chapter-progression";
import type { Chapter } from "@/lib/catalog";

type ChapterCompletionDialogProps = {
  chapter: Chapter;
  recommendation: ChapterRecommendation;
  dueCount: number;
  onPractiseAgain(): void;
  onClose(): void;
};

export function ChapterCompletionDialog({ chapter, recommendation, dueCount, onPractiseAgain, onClose }: ChapterCompletionDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocusTo?.isConnected) returnFocusTo.focus();
      else document.querySelector<HTMLElement>("[data-completion-return-focus]")?.focus();
    };
  }, []);

  const nextChapter = recommendation.kind === "chapter" ? recommendation.chapter : null;
  const primaryHref = nextChapter ? `/topics/${nextChapter.slug}` : "/progress";
  const primaryLabel = nextChapter ? "Study next chapter" : "View your progress";

  return <div className="completion-overlay" role="presentation">
    <section className="completion-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="completion-title" aria-describedby="completion-description">
      <button className="dialog-close" type="button" onClick={onClose}>Close</button>
      <p className="eyebrow">Chapter covered</p>
      <h2 id="completion-title">Every latest answer is correct.</h2>
      <p id="completion-description">{chapter.chapterNumber} — {chapter.chapterName} is covered. Scheduled review will help you retain it.</p>
      {nextChapter ? <div className="next-chapter-preview"><span>Recommended next</span><strong>{nextChapter.chapterNumber} — {nextChapter.chapterName}</strong><p>{nextChapter.questions.length} theory questions · {nextChapter.summary ? "Study guide available" : "Guide coming soon"}</p></div> : <div className="next-chapter-preview"><span>Learning path covered</span><strong>Review your overall progress</strong><p>All chapters currently have correct latest outcomes.</p></div>}
      <div className="completion-actions">
        <Link className="button" href={primaryHref} data-autofocus>{primaryLabel}</Link>
        {dueCount > 0 && <Link className="button secondary" href="/practice?due=1">Review {dueCount} due question{dueCount === 1 ? "" : "s"}</Link>}
        <button className="button secondary" type="button" onClick={onPractiseAgain}>Practise chapter again</button>
        <Link className="text-link" href="/topics">Back to all chapters</Link>
      </div>
    </section>
  </div>;
}
