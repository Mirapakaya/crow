# Crow self-hosted relay (optional)

Crow works as a static web app that talks to any WSS Nostr relay you choose.
This directory contains an optional, hardened self-run relay for users who want
more control over their metadata. It is **not required** to use Crow.

## What this relay does

- Accepts only the event kinds Crow uses.
- Caps event size, number of tags, and event age.
- Enforces NIP-40 expiration tags (auto-deletes expired wraps).
- Rate-limits publishes per IP.
- Runs strfry behind Caddy with modern security headers.
- Runs containers as non-root with read-only root filesystems.

## What it does not do

- It cannot see inside encrypted gift wraps.
- It still sees metadata: IP address, approximate size, timing, and which
  public key a wrap is addressed to. Tor or a VPN is needed to hide the IP.

## Quick start

```bash
cd infra
cp .env.example .env
# edit .env and set CROW_RELAY_DOMAIN to your real domain
docker compose up -d
```

## Add the relay in Crow

Add `wss://<CROW_RELAY_DOMAIN>` in Settings → Relays.

## Security notes

- Keep the strfry database on an encrypted host volume.
- The container runs read-only; the database is the only persistent volume.
- Caddy is configured to add HSTS and other security headers but this example
  listens on plain HTTP inside the compose network. In production, use a real
  TLS certificate and point DNS to the host.
