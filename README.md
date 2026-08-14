# Comprendoc

**Comprehend the docs. Act on what matters.**

Comprendoc is a privacy-minded document accessibility tool built for the OpenAI Build for Good developer challenge. It extracts document text in the browser, explains difficult paperwork in the reader's preferred language, identifies deadlines and required actions, links every deadline back to its source, and creates calendar events without requiring an account. The interface automatically follows the browser language, supports 11 mainstream languages, and includes a manual language picker.

The public ChatGPT Sites deployment is deliberately a zero-cost, synthetic-only demo: it has no login, accepts no user documents, makes no paid model requests, and blocks the analysis endpoint server-side. Clone and self-host the repository for the working application.

## What we built

Comprendoc turns difficult paperwork into clear, structured explanations and identifies what users need to do next. The MVP supports PDF, DOCX, TXT, and pasted text. PDF text extraction, scanned-page OCR, and DOCX parsing happen locally in the browser; only extracted text and page metadata are sent to the server-side OpenAI Responses API.

The result is separated into useful sections rather than one large AI response: plain-language summary, important points, deadlines, next steps, dates, money, jargon, warnings, and exact source text. Actionable dates can open Google Calendar or Outlook, or download as an ICS file for Apple Calendar and other apps.

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

- No accounts or persistent document history
- Original files are never sent to the backend
- No uploaded-document storage
- Provider keys are encrypted at rest with AES-256-GCM and are never returned by the settings API
- Extracted document text is not logged or used in analytics
- Uploaded document instructions are treated as untrusted data
- Missing dates, years, times, timezones, fees, or consequences are never silently invented

Comprendoc is an explanation aid, not an official authority or professional adviser. Users are always asked to verify important details against the original.

## Architecture

- Next.js-compatible App Router via vinext, React, and TypeScript
- Official OpenAI SDK, Responses API, and Structured Outputs with a strict Zod schema
- PDF.js for embedded PDF text and page rendering
- Tesseract.js for local OCR fallback on pages without useful embedded text
- Mammoth for local DOCX extraction
- Browser-native ICS, Google Calendar, and Outlook Calendar generation
- Cloudflare-compatible worker build for OpenAI Sites hosting
- Two enforced modes: a read-only public demo on `*.chatgpt.site`, and a functional self-hosted app elsewhere
- Encrypted SQLite/D1 provider vault for OpenAI, Anthropic, DeepSeek, GLM, Kimi, and Mistral

## How Codex helped

Codex implemented the application from the product brief, including the responsive interface, local extraction pipeline, OCR fallback, structured OpenAI route, source anchoring, calendar integrations, demo data, accessible focus and reduced-motion states, error handling, build fixes, tests, and this documentation. It also ran the production build and automated checks before deployment.

## How to run

Requirements: Node.js 22.13 or newer.

```bash
git clone <your-repository-url>
cd Comprendoc
npm install
cp .env.example .env.local
```

Generate a 32-byte encryption key and a separate administrator token:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Put the first value in `COMPRENDOC_MASTER_KEY` and the second in `COMPRENDOC_ADMIN_TOKEN` inside `.env.local`. Start the app, open **Settings**, enter the administrator token, and save any combination of supported provider keys. Keys are encrypted before SQLite/D1 storage, are decrypted only in server memory for a model request, and are never sent back to the browser. Back up the master key separately: losing or changing it makes every saved provider key undecryptable.

The administrator token protects settings changes, but the working app is intentionally designed as a personal self-hosted service. Keep it on a private network or place it behind your reverse proxy's authentication before exposing it to the internet; otherwise visitors could use the configured providers through the analysis endpoint.

To force a deployment into synthetic-only showcase mode on a non-Sites hostname, set:

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

Never commit `.env.local`, uploaded documents, real personal documents, tokens, or API keys.
