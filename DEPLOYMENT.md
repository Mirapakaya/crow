# Crow Deployment Guide

> Version 3.0.0 · Last updated 2026-10-02

Crow builds as a static Next.js site. `npm run build` outputs a `dist/` folder
that can be hosted anywhere. There is no server runtime or database.

## Build

```bash
npm install --legacy-peer-deps
npm run build
```

The static files land in `dist/`.

## Vercel (production)

The production deployment lives on Vercel.

- Project: `crow-main`
- Production domain: `https://crow-main-orpin.vercel.app`
- Custom domain (pending DNS): `https://crow.w8n.pw`

Vercel auto-deploys every push to `main`. Install command:
`npm install --legacy-peer-deps`.

## GitHub Pages (public preview)

A public preview deploys automatically from `main` using
`.github/workflows/pages.yml`.

- URL: `https://mirapakaya.github.io/crow/`

The project site is served under `/crow/`, so the workflow sets
`CROW_BASE_PATH=/crow` before building.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_VERSION` | `3.0.0` | Shown in Settings → About |
| `NEXT_PUBLIC_BUILD_TIME` | build time | ISO timestamp of the build |
| `NEXT_PUBLIC_SOURCE_URL` | `https://github.com/Mirapakaya/crow` | Source link |
| `CROW_BASE_PATH` | empty | Path prefix for the static export |

Never put secrets in `NEXT_PUBLIC_*` variables — they end up in the client
bundle.
