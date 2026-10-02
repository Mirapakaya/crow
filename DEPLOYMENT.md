# Crow Deployment Guide

> **Version:** 3.0.0 · **Last updated:** 2026-10-01

Crow is a static Next.js application (`output: 'export'`). After `next build`,
the entire app is a collection of static files in the `dist/` directory that can
be served by any web server or static hosting platform—no Node.js runtime is
required in production.

---

## 1. Build

All platforms share the same build step:

```bash
npm install --legacy-peer-deps
npm run build
```

This produces a fully static site in `dist/` (configured by `distDir: 'dist'` in
`next.config.ts`). The build includes a service worker for PWA/offline support.

---

## 2. Environment Variables

### Build-time variables (safe to expose — embedded in client bundle)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_VERSION` | `3.0.0` (from `package.json`) | Displayed in Settings → About |
| `NEXT_PUBLIC_BUILD_TIME` | Build timestamp | ISO 8601 timestamp of the build |
| `NEXT_PUBLIC_SOURCE_URL` | `https://github.com/Mirapakaya/crow` | Link to source code |

### Relay endpoints

Relay URLs are **not** baked into the build; users configure them at runtime
through the app's Settings → Relays interface. Default relays are hardcoded in
the application source, not via environment variables.

### ⚠️ Never put secrets in `NEXT_PUBLIC_*` variables

All `NEXT_PUBLIC_*` variables are inlined into the client JavaScript bundle at
build time and are visible to anyone who inspects the bundle. **Never** store
API keys, private keys, tokens, or any secret value in a `NEXT_PUBLIC_*`
variable.

There are no server-side environment variables because Crow is a fully static
export with no server-side rendering.

---

## 3. Platform-Specific Deployment

### 3.1 Vercel

| | |
|---|---|
| **Prerequisites** | Vercel account; GitHub repository connected |
| **Framework preset** | Next.js |
| **Install command** | `npm install --legacy-peer-deps` |
| **Build command** | `next build` (auto-detected) |
| **Output directory** | Default (Vercel auto-detects `dist/` from `next.config.ts`) |
| **Environment variables** | Set `NEXT_PUBLIC_*` vars in Vercel dashboard → Settings → Environment Variables |

**Steps:**

1. Push code to GitHub.
2. Import the repository in [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects Next.js. Override the install command to `npm install --legacy-peer-deps`.
4. Add any `NEXT_PUBLIC_*` environment variables in the Settings tab.
5. Deploy.

**Notes:**

- Vercel's Next.js preset handles `output: 'export'` correctly.
- Preview deployments are created automatically for pull requests.

---

### 3.2 Cloudflare Pages

| | |
|---|---|
| **Prerequisites** | Cloudflare account; `wrangler` CLI (optional) |
| **Build command** | `npx @cloudflare/next-on-pages` **or** `npm run build` (static export) |
| **Output directory** | `dist/` (if using static export) |

**Option A — Static export (recommended):**

1. Ensure `next.config.ts` has `output: 'export'` (it does).
2. Run `npm install --legacy-peer-deps && npm run build`.
3. Deploy the `dist/` directory via Cloudflare Pages dashboard or:

```bash
npx wrangler pages deploy dist/ --project-name=crow
```

**Option B — Next-on-Pages (for middleware/edge features):**

1. Install the adapter: `npm install -D @cloudflare/next-on-pages`
2. Build: `npx @cloudflare/next-on-pages`
3. Deploy: `npx wrangler pages deploy .vercel/output/static --project-name=crow`

**Notes:**

- Static export is simpler and fully sufficient for Crow (no SSR needed).
- Cloudflare's CDN provides global edge caching for free.

---

### 3.3 Netlify

| | |
|---|---|
| **Prerequisites** | Netlify account; Git repository connected |
| **Build command** | `npm install --legacy-peer-deps && npm run build` |
| **Publish directory** | `dist/` |

**netlify.toml:**

```toml
[build]
  command = "npm install --legacy-peer-deps && npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  conditions = { Role = ["admin"] }

# SPA fallback: serve index.html for all routes not found as files
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Notes:**

- The redirect rule ensures client-side routing works for all paths.
- Set `NEXT_PUBLIC_*` environment variables in Netlify dashboard → Site settings → Build & deploy → Environment.

---

### 3.4 Render

| | |
|---|---|
| **Prerequisites** | Render account; Git repository connected |
| **Build command** | `npm install --legacy-peer-deps && npm run build` |
| **Publish directory** | `dist/` |
| **Service type** | Static Site |

**Steps:**

1. Create a new Static Site in Render dashboard.
2. Connect your GitHub repository.
3. Set build command: `npm install --legacy-peer-deps && npm run build`.
4. Set publish directory: `dist/`.
5. Add `NEXT_PUBLIC_*` environment variables in the Environment section.

**Notes:**

- Render auto-detects changes from the connected branch.
- Free tier includes 100 GB/month bandwidth.

---

### 3.5 Railway

| | |
|---|---|
| **Prerequisites** | Railway account; Git repository connected |
| **Service type** | Static export or Docker |

**Option A — Static export via Docker:**

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

A `Dockerfile` and `nginx.conf` are included in the repository root:

```bash
docker build -t crow .
docker run -p 3000:80 crow
```

The image serves the static export from `dist/` with the same security headers
emitted by the Next.js config (CSP is in the HTML meta tag, but `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options` are added
by nginx for completeness).

**Option B — Next.js SSR (nixpacks):**

If you prefer server-side rendering (not required for Crow):

```bash
# Railway auto-detects Next.js and runs `next start`
# Set NIXPACKS_BUILD_CMD=npm install --legacy-peer-deps && npm run build
```

**Notes:**

- Static export is recommended for Crow since it requires no Node runtime.
- Railway's free trial includes limited hours; monitor usage.

---

### 3.6 Fly.io

| | |
|---|---|
| **Prerequisites** | Fly.io account; `flyctl` CLI installed |
| **Service type** | Docker deployment |

**Dockerfile:**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
# Serve with a lightweight static server
RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
```

**fly.toml:**

```toml
app = "crow-messenger"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  NEXT_PUBLIC_APP_VERSION = "3.0.0"
```

**Deploy:**

```bash
flyctl launch
flyctl deploy
```

**Notes:**

- Use a lightweight static server (e.g., `serve`, `http-server`) rather than
  `next start` since the output is fully static.
- Set `NEXT_PUBLIC_*` vars via `flyctl secrets set` (though they are only
  effective at build time for static exports).

---

### 3.7 GitHub Pages

| | |
|---|---|
| **Prerequisites** | GitHub repository; GitHub Actions enabled |
| **Build command** | `npm install --legacy-peer-deps && npm run build` |
| **Publish directory** | `dist/` |

**GitHub Actions workflow (`.github/workflows/deploy.yml`):**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm install --legacy-peer-deps
      - run: npm run build
      - name: Add .nojekyll
        run: touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

**Notes:**

- The `.nojekyll` file is **required** to prevent GitHub Pages from applying
  Jekyll processing, which would break Next.js output (files starting with `_`).
- GitHub Pages serves over HTTPS by default.
- Custom domains can be configured in repository Settings → Pages.
- `trailingSlash: true` in `next.config.ts` ensures compatibility with GitHub
  Pages' path handling.

---

### 3.8 Self-hosted — Nginx

| | |
|---|---|
| **Prerequisites** | Server with nginx installed; built `dist/` directory |
| **Config path** | `/etc/nginx/sites-available/crow` |

**nginx configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name crow.example.com;

    ssl_certificate     /etc/ssl/certs/crow.pem;
    ssl_certificate_key /etc/ssl/private/crow-key.pem;

    root /var/www/crow/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location /_next/static/ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src wss: https:; media-src blob:;" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
}
```

**Deploy:**

```bash
# Build locally or on the server
npm install --legacy-peer-deps && npm run build

# Copy to server
scp -r dist/ user@crow.example.com:/var/www/crow/dist/

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

**Notes:**

- Adjust the CSP `connect-src` directive to include your specific relay WebSocket
  URLs (e.g., `wss://relay.damus.io wss://nos.lol`).
- The `camera=(), microphone=(), geolocation=()` Permissions-Policy prevents
  passive use; Crow requests these only when the user initiates a call or
  location share, via explicit browser prompts.
- For automatic HTTPS, consider using Certbot/Let's Encrypt.

---

### 3.9 Self-hosted — Caddy

| | |
|---|---|
| **Prerequisites** | Caddy installed; built `dist/` directory |
| **Config path** | `Caddyfile` |

**Caddyfile:**

```caddyfile
crow.example.com {
    root * /var/www/crow/dist
    file_server

    # SPA fallback
    try_files {path} /index.html

    # Cache static assets
    @static path /_next/static/*
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Security headers
    header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src wss: https:; media-src blob:;"
    header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    header X-Content-Type-Options "nosniff"
    header X-Frame-Options "DENY"
    header Referrer-Policy "no-referrer"
    header Permissions-Policy "camera=(), microphone=(), geolocation=()"

    # Auto-HTTPS via Caddy (Let's Encrypt / ZeroSSL)
}
```

**Deploy:**

```bash
# Build
npm install --legacy-peer-deps && npm run build

# Copy to server
scp -r dist/ user@crow.example.com:/var/www/crow/dist/

# Start/reload Caddy
caddy reload --config Caddyfile
```

**Notes:**

- Caddy automatically provisions and renews TLS certificates.
- Adjust `connect-src` in the CSP to include your relay WebSocket URLs.
- Caddy's `file_server` handles ETags and conditional requests by default.

---

## 4. Deployment Checklist

- [ ] Run `npm install --legacy-peer-deps` (required due to peer dependency conflicts)
- [ ] Run `npm run build` and verify `dist/` is generated
- [ ] Set `NEXT_PUBLIC_APP_VERSION` if not using the `package.json` default
- [ ] Verify the deployed site loads and the service worker registers
- [ ] Test WebSocket connections to relays from the deployed URL
- [ ] Verify CSP headers allow `wss:` connections to your relays
- [ ] Confirm PWA install prompt appears (if desired)
- [ ] Check that `/.nojekyll` is present if deploying to GitHub Pages

---

## 5. Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Blank page after deploy | SPA routing not configured | Add fallback to `index.html` for all routes |
| Service worker not updating | Browser caching old SW | Clear site data; verify `next-pwa` generated `sw.js` in `dist/` |
| WebSocket connections fail | CSP blocks `wss:` | Add relay URLs to `connect-src` in CSP header |
| Images not loading | `images: { unoptimized: true }` means Next.js image optimization is off | Ensure original images are in `dist/`; use proper `<img>` or `next/image` with unoptimized |
| `npm install` fails | Peer dependency conflict | Use `--legacy-peer-deps` flag |
| 404 on refresh (GitHub Pages) | Missing `.nojekyll` or SPA fallback | Add `dist/.nojekyll`; ensure `trailingSlash: true` in config |
