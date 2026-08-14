# Comprendoc

**Comprehend the docs. Act on what matters.**

Comprendoc helps people understand important paperwork before they miss something that matters.

It turns complicated documents into clear explanations in the reader's preferred language, identifies required actions and deadlines, links those deadlines back to the exact source text, and helps users add important dates directly to their calendar.

Comprendoc is designed especially for immigrants, international students, second-language readers, people unfamiliar with bureaucratic terminology, and anyone overwhelmed by consequential paperwork.

It was built for the **OpenAI Build for Good** developer challenge.

The interface automatically follows the browser language, includes complete interface translations for six languages, and can generate explanations in 13 mainstream languages.

## Why it matters

Important information is often buried inside documents written for institutions rather than the people receiving them.

A reader may understand most of the words and still miss:

* A deadline
* A required action
* A fee
* An appointment
* A condition or exception
* A consequence of not responding

This becomes even harder when the document is written in a second language or uses unfamiliar legal, academic, administrative, financial, or bureaucratic terminology.

Comprendoc is designed to bridge that gap.

It does not just translate a document. It helps answer three practical questions:

**What does this mean?**

**What actually matters?**

**What do I need to do next?**

## Demo

The **full Comprendoc application is functional and self-hostable**.

The repository also includes a zero-cost public static showcase in [`demo/`](./demo), designed for Cloudflare Workers Static Assets.

The public showcase intentionally:

* Uses only synthetic example documents
* Accepts no user-uploaded documents
* Makes no AI API requests
* Makes no paid model requests
* Contains no provider configuration or saved user data

This prevents a public demo from consuming API quota or receiving sensitive personal documents.

Clone and self-host the main application to use the complete workflow, including real document extraction, OCR, AI analysis, deadline detection, source highlighting, saved results, and calendar integration.

## What we built

Comprendoc turns difficult paperwork into clear, structured explanations and identifies what users may need to do next.

The application supports:

* PDF
* DOCX
* TXT
* Pasted plain text

PDF text extraction, scanned-page OCR, and DOCX parsing happen locally in the browser.

Original files are not sent to the backend. Only extracted text and relevant page metadata are sent through the server for AI analysis.

Instead of returning one large AI-generated response, Comprendoc organizes the result into useful sections such as:

* Plain-language summary
* Important points
* Deadlines
* Required actions
* Important dates
* Money and fees
* Jargon explanations
* Warnings
* Uncertainty notes
* Exact supporting source text

Important deadlines can be linked directly back to the wording that produced them.

Actionable dates can also:

* Open in Google Calendar
* Open in Outlook
* Download as an ICS file for Apple Calendar and other compatible calendar applications

Self-hosted users can optionally save a processed result, reopen it without making another AI request, and permanently delete it from the document library.

## Who it helps

Comprendoc is especially useful for:

* Immigrants and newcomers
* International students
* People reading documents in a second language
* People unfamiliar with bureaucratic terminology
* People with lower reading proficiency
* Anyone overwhelmed by complicated paperwork

It can also help people who understand the language of a document but need the important actions, deadlines, and consequences surfaced more clearly.

## How it will be used

Examples include:

* Understanding a university enrollment notice
* Finding a deadline in a government or benefits letter
* Understanding what a landlord is requesting
* Identifying application due dates and consequences
* Highlighting required actions hidden inside long documents
* Adding important deadlines directly to a calendar
* Explaining unfamiliar terminology
* Translating paperwork into a preferred language

The app includes synthetic enrollment and apartment examples so the deadline-detection, source-highlighting, uncertainty, and calendar flows can be evaluated without using real personal documents.

## Privacy and safety

Comprendoc is designed around a local-first workflow.

* No accounts or repeated unlock prompts in the self-hosted application
* Original files are never sent to the backend
* PDF extraction, OCR, and DOCX parsing happen in the browser
* Saving is opt-in
* Saved extracted text and processed results are encrypted at rest with AES-256-GCM
* Provider keys are encrypted at rest with AES-256-GCM
* Provider keys are never returned by the settings API after being saved
* Provider keys appear only while the user is entering them
* Extracted document text is not logged
* Document text is not used in analytics
* Instructions contained inside uploaded documents are treated as untrusted data
* Missing dates, years, times, timezones, fees, or consequences are never silently invented
* Important extracted information is linked back to its source where possible

Comprendoc is an explanation aid, not an official authority or professional adviser.

Users are always encouraged to verify important deadlines, requirements, and consequences against the original document.

## How Codex helped

Codex was used throughout development to implement and iterate on Comprendoc from the original product brief.

It helped with:

* Responsive interface implementation
* Local document extraction
* PDF processing
* OCR fallback
* Structured AI analysis
* Multi-provider support
* Encrypted provider-key storage
* Encrypted document storage
* Source anchoring and highlighting
* Deadline detection
* Calendar integrations
* Synthetic demo data
* Multilingual interface support
* Accessibility improvements
* Focus and reduced-motion states
* Error handling
* Build fixes
* Automated testing
* Documentation

Codex also ran the production build and automated checks before deployment.

## OpenAI integration

The **OpenAI Responses API is the primary AI integration** used by Comprendoc.

AI output is validated against a strict Zod schema so the application receives structured results for deadlines, actions, dates, monetary amounts, jargon, warnings, and source references rather than relying on free-form text.

Self-hosted deployments can also optionally configure compatible adapters for:

* Anthropic
* DeepSeek
* GLM
* Kimi
* Mistral

The OpenAI integration remains a first-class supported path and is used where language understanding, simplification, translation, deadline interpretation, and structured document analysis add the most value.

## How to run

Requirements:

* Node.js 22.13 or newer

Clone the repository:

```bash
git clone https://github.com/leodenglovescode/comprendoc
cd comprendoc
npm install
cp .env.example .env.local
```

Generate the server-side 32-byte encryption key once:

```bash
openssl rand -base64 32
```

Put that value in `COMPRENDOC_MASTER_KEY` inside `.env.local`.

This is a server configuration secret, not a password users enter into Comprendoc. Configure it once and leave it in the environment.

Back it up separately. Losing or changing this key makes previously saved provider keys and encrypted documents undecryptable.

Start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Then open **Settings** and add the AI provider key you want to use.

Provider keys are:

1. Sent only to the local server
2. Encrypted before SQLite/D1 storage
3. Never returned through the settings API
4. Decrypted only in server memory when needed for an AI request
5. Sent to the selected provider over HTTPS

The browser receives provider status, model metadata, and the finished analysis, but never the stored provider key.

### Important self-hosting note

Comprendoc deliberately does not include an application login or administrator prompt because it is designed primarily as a personal, local-first self-hosted service.

Keep the full working application on your own device or private network unless you place it behind authentication.

If you expose it directly to the public internet without access control, visitors could potentially:

* Change provider settings
* Use configured API quota
* Access saved documents

The static public showcase is separate frontend code and does not expose these features.

### Synthetic showcase mode

To force the full application into synthetic-only showcase mode:

```bash
COMPRENDOC_MODE=demo
```

Then run:

```bash
npm run dev
```

### Production verification

```bash
npm run build
npm test
```

## Architecture

* Next.js-compatible App Router via vinext
* React
* TypeScript
* OpenAI Responses API
* Strict Zod structured-output validation
* Optional adapters for Anthropic, DeepSeek, GLM, Kimi, and Mistral
* PDF.js for embedded PDF text extraction and page rendering
* Tesseract.js for local OCR fallback
* Mammoth for local DOCX extraction
* Browser-native ICS generation
* Google Calendar integration
* Outlook Calendar integration
* Cloudflare-compatible worker build for the functional self-hosted application
* Separate static demo in `demo/`
* Encrypted SQLite/D1 provider vault
* Encrypted SQLite/D1 document library
* Reopen and confirmed-delete flows for saved documents

## Deploy the static demo with Cloudflare Workers Builds

Connect this GitHub repository to a Cloudflare Worker and use:

* **Production branch:** `main`
* **Root directory:** `demo`
* **Build command:** `npm run build`
* **Deploy command:** `npx wrangler deploy`

The demo uses plain HTML, CSS, and JavaScript deployed through Workers Static Assets.

A minimal Worker adds a strict Content Security Policy and cache headers.

The static demo:

* Has no application endpoints
* Has no provider settings
* Has no document storage
* Has no upload controls
* Makes no paid AI requests
* Makes no network requests
* Automatically follows the browser language
* Supports all six fully translated interface locales
