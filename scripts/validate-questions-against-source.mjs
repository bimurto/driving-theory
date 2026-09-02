import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const themesPath = path.join(root, "themes");

const CONCURRENCY = 8;
const DELAY_MS = 200;
const SAMPLE = null;
const CHAPTER = null;
const QUESTION_ID = null;
const UPDATE_JSON = true;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(text) {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalize(text) {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

function parseQuestion(html) {
  const titleMatch = html.match(/<h2 class="title">([\s\S]*?)<\/h2>/);
  const questionText = titleMatch ? normalize(stripTags(titleMatch[1])) : "";

  const secondaryMatch = html.match(/<h2 class="title">[\s\S]*?<\/h2>\s*<div class="hint">[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>/);
  const secondaryText = secondaryMatch ? normalize(stripTags(secondaryMatch[1])) : "";
  const fullQuestionText = secondaryText ? `${questionText}\n${secondaryText}` : questionText;

  const infoMatches = [...html.matchAll(/<h1 class="questionInfo">([\s\S]*?)<\/h1>/g)];
  const points = infoMatches.length >= 2 ? normalize(stripTags(infoMatches[1][1])) : "";

  const optionsBlockMatch = html.match(/<div class="options">[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
  const allOptions = [];
  if (optionsBlockMatch) {
    const optionItems = [...optionsBlockMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)];
    for (const item of optionItems) {
      const letterMatch = item[1].match(/<b class="optionName">(.*?)<\/b>/);
      const letter = letterMatch ? normalize(stripTags(letterMatch[1])) : "";
      const textContent = normalize(stripTags(item[1].replace(/<b class="optionName">[\s\S]*?<\/b>/, "")));
      allOptions.push({ letter, text: textContent });
    }
  }

  const correctBlockMatch = html.match(/<h3 id="correct">[\s\S]*?<div class="options">[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
  const correctAnswers = [];
  if (correctBlockMatch) {
    const correctItems = [...correctBlockMatch[1].matchAll(/<li>([\s\S]*?)<\/li>/g)];
    for (const item of correctItems) {
      const letterMatch = item[1].match(/<b class="optionName">(.*?)<\/b>/);
      const letter = letterMatch ? normalize(stripTags(letterMatch[1])) : "";
      const textContent = normalize(stripTags(item[1].replace(/<b class="optionName">[\s\S]*?<\/b>/, "")));
      correctAnswers.push({ letter, text: textContent });
    }
  }

  const commentMatch = html.match(/<div class="comment">\s*<p>([\s\S]*?)<\/p>/);
  const comment = commentMatch ? normalize(stripTags(commentMatch[1])) : "";

  return { questionText: fullQuestionText, questionTextPrimary: questionText, questionTextSecondary: secondaryText, points, allOptions, correctAnswers, comment };
}

async function collectQuestionFiles() {
  const entries = await readdir(themesPath, { withFileTypes: true });
  const files = [];
  for (const theme of entries.filter((e) => e.isDirectory())) {
    const themePath = path.join(themesPath, theme.name);
    const leaves = await readdir(themePath, { withFileTypes: true });
    for (const leaf of leaves.filter((e) => e.isDirectory())) {
      const filePath = path.join(themePath, leaf.name, "questions_class_b.json");
      try {
        const questions = JSON.parse(await readFile(filePath, "utf8"));
        files.push({ theme: theme.name, chapter: leaf.name, questions });
      } catch { /* skip */ }
    }
  }
  return files;
}

function arraysMatch(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1000 * attempt);
    }
  }
}

async function validateQuestion(question) {
  const url = question.url;
  const html = await fetchWithRetry(url);
  const parsed = parseQuestion(html);

  const mismatches = [];
  let needsSecondaryUpdate = false;

  if (normalize(question.question_text) !== normalize(parsed.questionText)) {
    const localHasSecondary = question.question_text.includes("\n");
    const sourceHasSecondary = !!parsed.questionTextSecondary;

    if (sourceHasSecondary && !localHasSecondary && normalize(question.question_text) === normalize(parsed.questionTextPrimary)) {
      needsSecondaryUpdate = true;
      mismatches.push({
        field: "question_text",
        local: question.question_text,
        source: parsed.questionText,
        sourcePrimary: parsed.questionTextPrimary,
        sourceSecondary: parsed.questionTextSecondary,
        action: "will_append_secondary",
      });
    } else {
      mismatches.push({
        field: "question_text",
        local: question.question_text,
        source: parsed.questionText,
        sourcePrimary: parsed.questionTextPrimary,
        sourceSecondary: parsed.questionTextSecondary,
      });
    }
  }

  if (normalize(question.points) !== parsed.points) {
    mismatches.push({
      field: "points",
      local: question.points,
      source: parsed.points,
    });
  }

  const localOptions = question.options.map((o) => ({
    letter: normalize(o.letter),
    text: normalize(o.text),
  }));
  if (!arraysMatch(
    localOptions.map((o) => `${o.letter} ${o.text}`),
    parsed.allOptions.map((o) => `${o.letter} ${o.text}`),
  )) {
    mismatches.push({
      field: "options",
      local: localOptions,
      source: parsed.allOptions,
    });
  }

  const localCorrect = question.correct_answers.map((a) => ({
    letter: normalize(a.letter),
    text: normalize(a.text),
  }));
  if (!arraysMatch(
    localCorrect.map((a) => `${a.letter} ${a.text}`),
    parsed.correctAnswers.map((a) => `${a.letter} ${a.text}`),
  )) {
    mismatches.push({
      field: "correct_answers",
      local: localCorrect,
      source: parsed.correctAnswers,
    });
  }

  if (normalize(question.comment || "") !== parsed.comment) {
    mismatches.push({
      field: "comment",
      local: question.comment,
      source: parsed.comment,
    });
  }

  return { questionId: question.question_id, url, mismatches, needsSecondaryUpdate, sourceSecondary: parsed.questionTextSecondary, theme: question._theme, chapter: question._chapter };
}

async function runPool(items, worker, concurrency) {
  const results = [];
  let index = 0;
  let completed = 0;
  const total = items.length;

  async function next() {
    while (index < total) {
      const currentIndex = index++;
      const item = items[currentIndex];
      try {
        const result = await worker(item, currentIndex);
        results[currentIndex] = result;
        completed++;
        if (result.mismatches.length) {
          console.log(`[${completed}/${total}] MISMATCH: ${result.questionId} (${result.mismatches.length} fields)`);
        } else {
          process.stdout.write(`\r[${completed}/${total}] OK: ${result.questionId}        `);
        }
      } catch (error) {
        completed++;
        results[currentIndex] = {
          questionId: item.question_id || "?",
          url: item.url,
          mismatches: [{ field: "_fetch_error", local: "", source: error.message }],
        };
        console.log(`\n[${completed}/${total}] FETCH ERROR: ${item.question_id}: ${error.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  process.stdout.write("\n");
  return results;
}

async function main() {
  console.log("Collecting question files...");
  const files = await collectQuestionFiles();

  let allQuestions = [];
  for (const file of files) {
    for (const q of file.questions) {
      allQuestions.push({ ...q, _theme: file.theme, _chapter: file.chapter });
    }
  }

  console.log(`Found ${allQuestions.length} questions across ${files.length} chapters.`);

  if (CHAPTER) {
    allQuestions = allQuestions.filter((q) => q._chapter === CHAPTER);
    console.log(`Filtered to chapter "${CHAPTER}": ${allQuestions.length} questions.`);
  }

  if (QUESTION_ID) {
    allQuestions = allQuestions.filter((q) => q.question_id === QUESTION_ID);
    console.log(`Filtered to question "${QUESTION_ID}": ${allQuestions.length} questions.`);
  }

  if (SAMPLE) {
    allQuestions = allQuestions.slice(0, SAMPLE);
    console.log(`Sampling first ${SAMPLE} questions.`);
  }

  console.log(`Validating with concurrency=${CONCURRENCY}, delay=${DELAY_MS}ms...\n`);

  const results = await runPool(allQuestions, validateQuestion, CONCURRENCY);

  const passed = results.filter((r) => r.mismatches.length === 0).length;
  const failed = results.filter(
    (r) => r.mismatches.length > 0 && !r.mismatches.some((m) => m.field === "_fetch_error"),
  ).length;
  const errors = results.filter(
    (r) => r.mismatches.some((m) => m.field === "_fetch_error"),
  ).length;

  const secondaryUpdates = results.filter((r) => r.needsSecondaryUpdate);
  console.log(`\nQuestions with missing secondary line: ${secondaryUpdates.length}`);

  if (UPDATE_JSON && secondaryUpdates.length > 0) {
    const updatesByFile = new Map();
    for (const update of secondaryUpdates) {
      const filePath = path.join(themesPath, update.theme, update.chapter, "questions_class_b.json");
      if (!updatesByFile.has(filePath)) updatesByFile.set(filePath, []);
      updatesByFile.get(filePath).push(update);
    }

    let totalUpdated = 0;
    for (const [filePath, updates] of updatesByFile) {
      const questions = JSON.parse(await readFile(filePath, "utf8"));
      for (const update of updates) {
        const q = questions.find((q) => q.question_id === update.questionId);
        if (q) {
          q.question_text = `${q.question_text}\n${update.sourceSecondary}`;
          totalUpdated++;
          console.log(`  Updated ${update.questionId}: appended "${update.sourceSecondary}"`);
        }
      }
      await writeFile(filePath, JSON.stringify(questions, null, 2) + "\n", "utf8");
      console.log(`  Wrote ${filePath}`);
    }
    console.log(`Updated ${totalUpdated} questions across ${updatesByFile.size} files.`);
  }

  const report = {
    validatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    fetchErrors: errors,
    secondaryLinesFound: secondaryUpdates.length,
    secondaryLinesUpdated: UPDATE_JSON ? secondaryUpdates.length : 0,
    mismatches: results.filter((r) => r.mismatches.length > 0),
  };

  const reportPath = path.join(root, "scripts", "validation-report.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nDone.`);
  console.log(`  Passed:            ${passed}`);
  console.log(`  Mismatches:        ${failed}`);
  console.log(`  Fetch errors:      ${errors}`);
  console.log(`  Secondary lines:   ${secondaryUpdates.length} found, ${UPDATE_JSON ? secondaryUpdates.length : 0} updated`);
  console.log(`  Report:            ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});