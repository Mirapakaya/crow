# Crow Deployment Guide

> **Version:** 3.0.0 · **Last updated:** 2026-10-02

Crow is a static Next.js app. Running `npm run build` creates a `dist/` folder
with plain HTML, CSS, and JS that any web server can host. There is no server
runtime or database.

## Build

```bash
npm install --legacy-peer-deps
npm run build
```

Output goes to `dist/`. For local testing:

```bash
npx serve dist
```

## Deploy to GitHub Pages

The repo includes `.github/workflows/pages.yml`, which builds and deploys to
GitHub Pages on every push to `main`. The site is served under `/crow/`, so the
workflow sets `CROW_BASE_PATH=/crow`.

To enable Pages:

1. Go to **Settings → Pages** in the GitHub repo.
2. Under **Build and deployment**, choose **GitHub Actions**.
3. Push to `main`. The workflow does the rest.

## Deploy with Docker

A `Dockerfile` and `nginx.conf` are included in the repo root.

```bash
docker build -t crow .
docker run -p 3000:80 crow
```

The image builds the static export and serves it with nginx. It adds basic
security headers (`X-Frame-Options`, `Referrer-Policy`, etc.) and an SPA
fallback so client-side routes keep working on refresh.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_VERSION` | `3.0.0` | Shown in Settings → About |
| `NEXT_PUBLIC_BUILD_TIME` | build time | ISO timestamp of the build |
| `NEXT_PUBLIC_SOURCE_URL` | `https://github.com/Mirapakaya/crow` | Source link |
| `CROW_BASE_PATH` | empty | Path prefix for the static export (e.g. `/crow` for GitHub Pages) |

Never put secrets in `NEXT_PUBLIC_*` variables — they are embedded in the
client bundle.
