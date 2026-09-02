import Link from "next/link";
import { getAdjacentChapters } from "@/lib/chapter-progression";
import type { Chapter } from "@/lib/catalog";

type PracticeChapterNavigationProps = {
  chapter: Chapter;
  chapters: Chapter[];
  onNavigate(chapter: Chapter): void;
};

export function PracticeChapterNavigation({ chapter, chapters, onNavigate }: PracticeChapterNavigationProps) {
  const adjacent = getAdjacentChapters(chapters, chapter.slug);
  const previousChapter = adjacent.previous;
  const nextChapter = adjacent.next;
  const chapterPosition = chapters.findIndex((item) => item.slug === chapter.slug) + 1;

  return <nav className="practice-chapter-navigation" aria-label="Practice chapter navigation">
    <p><span>Chapter {chapterPosition} of {chapters.length}</span><strong>{chapter.chapterNumber} — {chapter.chapterName}</strong></p>
    <div>
      {previousChapter ? <Link className="button secondary" href={`/practice?chapter=${previousChapter.slug}`} onClick={() => onNavigate(previousChapter)}>← Previous chapter</Link> : <button className="button secondary" type="button" disabled>← Previous chapter</button>}
      {nextChapter ? <Link className="button secondary" href={`/practice?chapter=${nextChapter.slug}`} onClick={() => onNavigate(nextChapter)}>Next chapter →</Link> : <button className="button secondary" type="button" disabled>Next chapter →</button>}
    </div>
  </nav>;
}
