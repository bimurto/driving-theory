# driving-theory

English study material for the German Class B driving theory exam, delivered as
a static web app.

## Web app

The app lives in [`webapp/`](./webapp/) and is built from the Class B questions,
chapter summaries, and local media in this repository.

```bash
cd webapp
npm install
npm run dev
```

For a production static build:

```bash
npm run build
```

Deploy the generated `webapp/out/` directory to a static host. See the
[web app README](./webapp/README.md) for details.

## Study materials

[`themes/`](./themes/) contains the Class B worksheets and English chapter
summaries. [`themes/SUMMARY_GUIDE.md`](./themes/SUMMARY_GUIDE.md) documents the
summary format, sources, and coverage requirements.
