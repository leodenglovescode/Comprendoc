import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { analysisSchema } from "../../../lib/schema";
import { COMPRENDOC_SYSTEM_PROMPT } from "../../../lib/prompt";

export const runtime = "edge";

function isDemoRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return process.env.COMPRENDOC_MODE === "demo" || host.endsWith(".chatgpt.site");
}

export async function POST(request: Request) {
  try {
    if (isDemoRequest(request)) return Response.json({ error: "Live analysis is disabled on the public demo. Self-host Comprendoc to analyze your own documents." }, { status: 403 });
    const body = await request.json() as { pages?: Array<{ page: number; text: string }>; targetLanguage?: string; level?: string; documentName?: string };
    if (!body.pages?.length || !body.pages.some((page) => page.text?.trim())) return Response.json({ error: "No readable document text was provided." }, { status: 400 });
    const total = body.pages.reduce((sum, page) => sum + page.text.length, 0);
    if (total > 180_000) return Response.json({ error: "This document is too long for one safe analysis. Please split it into smaller files; no text was silently removed." }, { status: 413 });
    const sessionKey = request.headers.get("x-comprendoc-api-key")?.trim();
    const apiKey = process.env.OPENAI_API_KEY || sessionKey;
    if (!apiKey) return Response.json({ error: "Add an OpenAI API key in Settings, or configure OPENAI_API_KEY on the server." }, { status: 503 });
    const openai = new OpenAI({ apiKey });
    const pageText = body.pages.map((p) => `<page number="${p.page}">\n${p.text}\n</page>`).join("\n\n");
    const response = await openai.responses.parse({
      model: "gpt-5-mini",
      instructions: COMPRENDOC_SYSTEM_PROMPT,
      input: `Explain the document in ${body.targetLanguage || "English"} at a ${body.level || "Simple"} explanation level. Document filename: ${body.documentName || "document"}.\n\n${pageText}`,
      text: { format: zodTextFormat(analysisSchema, "comprendoc_analysis") },
    });
    if (!response.output_parsed) return Response.json({ error: "The explanation could not be structured safely. Please try again." }, { status: 502 });
    return Response.json(response.output_parsed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof OpenAI.RateLimitError ? 429 : 500;
    const message = status === 429 ? "Comprendoc is receiving many requests. Please wait a moment and try again." : "Comprendoc could not explain this document right now. Your original file was not stored.";
    return Response.json({ error: message }, { status });
  }
}
