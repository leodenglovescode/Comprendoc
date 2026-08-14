# Comprendoc

**Comprehend the docs. Act on what matters.**

Comprendoc is a privacy-minded document accessibility tool built for the OpenAI Build for Good developer challenge. It extracts document text in the browser, explains difficult paperwork in the reader's preferred language, identifies deadlines and required actions, links every deadline back to its source, and creates calendar events without requiring an account. The interface automatically follows the browser language, has complete interface translations for six languages, and offers explanations in 13 mainstream languages.

The repository includes a zero-cost static demo in [`demo/`](./demo) for Cloudflare Pages. It accepts no user documents, makes no network or paid model requests, and contains only synthetic examples. Clone and self-host the main application for the complete workflow.

## What we built

Comprendoc turns difficult paperwork into clear, structured explanations and identifies what users need to do next. The MVP supports PDF, DOCX, TXT, and pasted text. PDF text extraction, scanned-page OCR, and DOCX parsing happen locally in the browser; only extracted text and page metadata are sent through the server to the selected AI provider.

The result is separated into useful sections rather than one large AI response: plain-language summary, important points, deadlines, next steps, dates, money, jargon, warnings, and exact source text. Actionable dates can open Google Calendar or Outlook, or download as an ICS file for Apple Calendar and other apps. Self-hosted users can save an encrypted processed result, reopen it without another AI request, and permanently delete it from the document library.

## Who it helps

Comprendoc is especially useful for:

- Immigrants and newcomers
- International students
- People reading documents in a second language
- People unfamiliar with bureaucratic terminology
- People with lower reading proficiency
- Anyone overwhelmed by complicated paperwork

## How it will be used

- Understand a university enrollment notice
- Find a deadline in a government or benefits letter
- Understand what a landlord is requesting
- Identify application due dates and consequences
- Add important deadlines directly to a calendar
- Explain unfamiliar terminology
- Translate paperwork into a preferred language

The app includes synthetic enrollment and apartment examples so the deadline, source-highlighting, uncertainty, and calendar flows can be evaluated without using real personal documents.

## Privacy and safety

- No accounts or repeated unlock prompts in the local-first self-hosted app
- Original files are never sent to the backend
- Saving is opt-in; saved extracted text and processed results are encrypted at rest with AES-256-GCM
- Provider keys are encrypted at rest with AES-256-GCM and are never returned by the settings API
- Provider keys appear only in the password field while being entered; after saving, the frontend receives status and model metadata, never the key
- Extracted document text is not logged or used in analytics
- Uploaded document instructions are treated as untrusted data
- Missing dates, years, times, timezones, fees, or consequences are never silently invented

Comprendoc is an explanation aid, not an official authority or professional adviser. Users are always asked to verify important details against the original.

## Architecture

- Next.js-compatible App Router via vinext, React, and TypeScript
- OpenAI Responses API plus compatible adapters for Anthropic, DeepSeek, GLM, Kimi, and Mistral, validated with a strict Zod schema
- PDF.js for embedded PDF text and page rendering
- Tesseract.js for local OCR fallback on pages without useful embedded text
- Mammoth for local DOCX extraction
- Browser-native ICS, Google Calendar, and Outlook Calendar generation
- Cloudflare-compatible worker build for the functional self-hosted application
- A separate dependency-free static demo in `demo/` for Cloudflare Pages
- Encrypted SQLite/D1 provider vault for OpenAI, Anthropic, DeepSeek, GLM, Kimi, and Mistral
- Encrypted SQLite/D1 document library with reopen and confirmed-delete flows

## How Codex helped

Codex implemented the application from the product brief, including the responsive interface, local extraction pipeline, OCR fallback, structured multi-provider analysis, encrypted provider and document storage, source anchoring, calendar integrations, demo data, multilingual UI, accessible focus and reduced-motion states, error handling, build fixes, tests, and this documentation. It also ran the production build and automated checks before deployment.

## How to run

Requirements: Node.js 22.13 or newer.

```bash
git clone https://github.com/leodenglovescode/comprendoc
cd Comprendoc
npm install
cp .env.example .env.local
```

Generate the server-side 32-byte encryption key once:

```bash
openssl rand -base64 32
```

Put that value in `COMPRENDOC_MASTER_KEY` inside `.env.local`. This is a server configuration secret, not a password users enter in Comprendoc: configure it once and leave it in the environment. Back it up separately because losing or changing it makes every saved provider key and document undecryptable.

Start the app and open **Settings**. Settings and the document library open directly because Comprendoc is designed as a local-first, personal self-hosted service. Paste each provider API key once and save it. The key is sent only to the local server, encrypted before SQLite/D1 storage, and never returned by any API or displayed in the frontend after saving. During document analysis, the server decrypts the selected key only in memory and sends it to that provider over HTTPS. The browser receives only provider status, model metadata, and the finished analysis.

Because there is deliberately no application login or administrator prompt, keep the working app on your own device or private network. If you expose it to the internet, put it behind authentication in your reverse proxy; otherwise visitors could change providers, use your configured API quota, or access saved documents. The Cloudflare Pages demo is separate static frontend code: it contains no upload controls, backend routes, provider settings, storage, or paid analysis.

To force the full application into synthetic-only showcase mode, set:

```bash
COMPRENDOC_MODE=demo
```

Then run:

```bash
npm run dev
```

Open `http://localhost:3000`. For a production verification build:

```bash
npm run build
npm test
```

## Deploy the static demo to Cloudflare Pages

Create a Pages project from this GitHub repository and use:

- Production branch: `main`
- Root directory: `demo`
- Build command: leave blank
- Build output directory: `.`

The demo is plain HTML, CSS, and JavaScript with a strict Content Security Policy. It automatically follows the browser language, supports all six fully translated interface locales, and makes no network requests.

Never commit `.env.local`, uploaded documents, real personal documents, tokens, or API keys.
