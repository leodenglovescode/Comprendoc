# Comprendoc static demo

This directory is a zero-cost, frontend-only demo for Cloudflare Pages. It uses synthetic documents and makes no network requests, uploads, API calls, or writes to storage.

## Cloudflare Pages settings

- Production branch: `main`
- Root directory: `demo`
- Build command: leave blank
- Build output directory: `.`

Cloudflare Pages will serve `index.html` directly. The included `_headers` file applies a strict content security policy, and `_redirects` provides a single-page fallback.

To preview locally:

```bash
npx wrangler pages dev demo
```
