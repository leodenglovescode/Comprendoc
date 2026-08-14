# Comprendoc static demo

This directory is a zero-cost static demo for Cloudflare Workers Static Assets. It uses synthetic documents and makes no browser network requests, uploads, API calls, or writes to storage. A tiny Worker adds security and cache headers before serving the static files.

## Cloudflare Workers Builds settings

- Production branch: `main`
- Root directory: `demo`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The build copies only the four public assets into `dist/`. Wrangler deploys them using Workers Static Assets, while `worker.js` applies the strict security headers. The project also keeps `_headers` and `_redirects` for compatibility with legacy Pages deployments.

To preview locally:

```bash
cd demo
npm install
npm run build
npm run dev
```
