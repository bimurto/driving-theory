# German Class B Driving Theory

An unofficial English-language study app for the German Class B driving theory
exam. Revise questions by topic, read concise chapter summaries, and practise
in your browser.

## Study online

The deployed app is available on GitHub Pages:
[bimurto.github.io/driving-theory](https://bimurto.github.io/driving-theory/).

> **Important:** This is a revision aid, not official training material. Rules
> and exam content can change; use current official guidance, driving-school
> instruction, and German law as the authority.

## What is included

- **1,592 Class B questions** organised into chapters and topics.
- English study summaries that explain rules, exceptions, and common exam
  pitfalls.
- Referenced images and videos where available.
- Browser-local practice progress; it is not shared between devices.

## Start studying locally

The static web app is in [`webapp/`](./webapp/):

```bash
cd webapp
npm install
npm run dev
```

Open the local address shown in the terminal. For building, deployment, and
testing details, see the [web app README](./webapp/README.md).

## Repository guide

| Location | Purpose |
| --- | --- |
| [`themes/`](./themes/) | Class B question banks and chapter summaries. |
| [`webapp/`](./webapp/) | The Next.js study app and its catalogue builder. |
| [`images/`](./images/) and [`videos/`](./videos/) | Local media referenced by the question banks. |

Each chapter is built from `questions_class_b.json` and, where available,
`summary.md`. The app generates its study catalogue from those files and copies
only the media they reference. See the [summary authoring guide](./themes/SUMMARY_GUIDE.md)
for the content contract and source requirements.

## Maintaining content

When updating a chapter, keep its `questions_class_b.json` data and `summary.md`
in sync. Run the app checks before committing:

```bash
cd webapp
npm test
```

The repository intentionally keeps only the filtered Class B question banks;
do not reintroduce the removed unfiltered `questions.json` or `questions.md`
exports.
