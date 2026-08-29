import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const guidePath = path.join(root, "CLASS_B_THEORY_STUDY_GUIDE.md");
const themesPath = path.join(root, "themes");

async function collectFiles(directory, filename) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, filename);
    return entry.isFile() && entry.name === filename ? [entryPath] : [];
  }));
  return nested.flat();
}

const failures = [];
const fail = (message) => failures.push(message);

let guide = "";
try {
  guide = await readFile(guidePath, "utf8");
} catch {
  fail("CLASS_B_THEORY_STUDY_GUIDE.md does not exist");
}

if (guide) {
  const words = guide.match(/[\p{L}\p{N}][\p{L}\p{N}’'./+-]*/gu) ?? [];
  if (words.length < 15_000 || words.length > 21_000) {
    fail(`guide word count must be 15,000–21,000; found ${words.length}`);
  }

  for (const heading of [
    "# Class B Theory Study Guide",
    "## Table of contents",
    "## Quick exam cheat sheet",
  ]) {
    if (!guide.includes(heading)) fail(`missing required heading: ${heading}`);
  }

  const majorSections = guide.match(/^## \d+\. /gm) ?? [];
  if (majorSections.length < 10) fail(`expected at least 10 major numbered themes; found ${majorSections.length}`);

  for (const marker of ["### Common exam traps", "**Remember:**"]) {
    if (!guide.includes(marker)) fail(`missing learning marker: ${marker}`);
  }

  for (const term of ["Vorfahrt", "Reaktionsweg", "Bremsweg", "Anhalteweg", "Autobahn", "Kraftfahrstraße"]) {
    if (!guide.includes(term)) fail(`missing important German term: ${term}`);
  }

  const reviewedCoverage = new Map([
    ["overtaking worksheet estimate", "800 m"],
    ["posted level-crossing speed", "10 km/h"],
    ["high-speed fuel comparison", "35%"],
    ["wet drum-brake recovery", "wet drum brakes"],
    ["breath-alcohol threshold", "0.25 mg/l"],
    ["weekly regulated driving limit", "56 hours"],
    ["tachograph roadside record period", "preceding 56 days"],
  ]);
  for (const [topic, fact] of reviewedCoverage) {
    if (!guide.includes(fact)) fail(`missing reviewed question coverage: ${topic} (${fact})`);
  }

  if (/!\[[^\]]*\]\(/.test(guide) || /<(?:img|video|audio|picture|source)\b/i.test(guide)) {
    fail("guide must not embed media");
  }
  if (/https?:\/\//.test(guide) || /\]\((?!#)[^)]+\)/.test(guide)) {
    fail("guide must not contain external links or citations");
  }
}

const summaryFiles = await collectFiles(themesPath, "summary.md");
if (summaryFiles.length !== 92) fail(`expected 92 chapter summaries; found ${summaryFiles.length}`);

const questionFiles = await collectFiles(themesPath, "questions_class_b.json");
let questionCount = 0;
for (const questionFile of questionFiles) {
  const questions = JSON.parse(await readFile(questionFile, "utf8"));
  questionCount += questions.length;
}
if (questionFiles.length !== 97) fail(`expected 97 question files; found ${questionFiles.length}`);
if (questionCount !== 1_592) fail(`expected 1,592 theory questions; found ${questionCount}`);

if (failures.length) {
  console.error(failures.map((failure) => `FAIL: ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`PASS: guide structure and source inventory validated (${questionCount} theory questions, ${summaryFiles.length} chapter summaries)`);
