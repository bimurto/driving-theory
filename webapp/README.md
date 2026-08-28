# RoadReady Class B web app

A static, browser-local study app generated from this repository's English
Class B worksheets and summaries.

> **Important:** This is an unofficial English-language revision aid. Current
> official guidance, driving-school instruction, and German law take precedence
> over this app.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` rebuilds the generated Class B catalogue and copies only
referenced media into `public/media/` before starting Next.js. Open the local
URL reported by Next.js.

## Build for a static host

```bash
npm run build
```

Deploy `out/`. Learner progress stays in the browser's local storage and is not
shared across devices.

The current Class B media bundle is large (roughly 616 MB), so select a host
with a suitable deployment limit or serve `public/media/` from a separate CDN
before publishing.

## Verification

```bash
npm test
```
