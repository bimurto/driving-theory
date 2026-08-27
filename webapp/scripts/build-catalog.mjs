import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appRoot = path.join(root, "webapp");
const themesRoot = path.join(root, "themes");

const entries = await (await import("node:fs/promises")).readdir(themesRoot, { withFileTypes: true });
const chapters = [];
const mediaPaths = new Set();
for (const theme of entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const themePath = path.join(themesRoot, theme.name);
  const leaves = await (await import("node:fs/promises")).readdir(themePath, { withFileTypes: true });
  for (const leaf of leaves.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const leafPath = path.join(themePath, leaf.name);
    const questionPath = path.join(leafPath, "questions_class_b.json");
    try {
      const questions = JSON.parse(await readFile(questionPath, "utf8"));
      if (!questions.length) continue;
      let summary = null;
      try {
        summary = (await readFile(path.join(leafPath, "summary.md"), "utf8"))
          .replace(/^---[\s\S]*?---\s*/, "")
          .replace(/<!--\s*questions:\s*[^>]*-->/g, "")
          .replace(/^# .+\n+/, "");
      } catch { /* Some chapters are intentionally awaiting a guide. */ }
      const first = questions[0];
      for (const question of questions) {
        for (const mediaPath of [...(question.local_image_paths || []), ...(question.local_video_paths || [])]) mediaPaths.add(mediaPath);
      }
      chapters.push({
        slug: leaf.name,
        themeSlug: theme.name,
        themeName: first.theme_name,
        themeNumber: first.theme_number,
        chapterName: first.chapter_name,
        chapterNumber: first.chapter_number,
        summary,
        questions: questions.map((q) => ({
          id: q.question_id,
          number: q.question_number,
          text: q.question_text,
          points: q.points,
          options: q.options.map((option) => option.text),
          correctAnswers: q.correct_answers.map((answer) => answer.text),
          explanation: q.comment || "",
          images: q.local_image_paths || [],
          videos: q.local_video_paths || [],
          sourceUrl: q.url
        }))
      });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

await mkdir(path.join(appRoot, "src/generated"), { recursive: true });
await writeFile(path.join(appRoot, "src/generated/catalog.json"), JSON.stringify({ generatedAt: new Date().toISOString(), chapters }, null, 2));

const mediaRoot = path.join(appRoot, "public/media");
await rm(mediaRoot, { recursive: true, force: true });
await mkdir(mediaRoot, { recursive: true });
for (const mediaPath of mediaPaths) {
  const source = path.join(root, mediaPath);
  const destination = path.join(mediaRoot, mediaPath);
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.warn(`Missing referenced media: ${mediaPath}`);
  }
}
console.log(`Prepared ${chapters.length} Class B chapters and ${mediaPaths.size} media assets.`);
