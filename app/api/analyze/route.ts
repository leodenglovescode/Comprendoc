import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { analysisSchema } from "../../../lib/schema";
import { COMPRENDOC_SYSTEM_PROMPT } from "../../../lib/prompt";
import { loadProviderCredential } from "../../../lib/provider-storage";

export const runtime = "edge";

function isDemoRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return process.env.COMPRENDOC_MODE === "demo" || host.endsWith(".chatgpt.site");
}

function parseJsonText(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return analysisSchema.parse(JSON.parse(cleaned));
}

async function analyzeWithCompatibleProvider(config: Awaited<ReturnType<typeof loadProviderCredential>>, input: string) {
  const schemaInstruction = `\n\nReturn only JSON matching this JSON Schema exactly. Do not use Markdown fences:\n${JSON.stringify(z.toJSONSchema(analysisSchema))}`;
  if (config.definition.protocol === "anthropic") {
    const response = await fetch(`${config.definition.baseUrl}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: config.model, max_tokens: 8192, system: COMPRENDOC_SYSTEM_PROMPT + schemaInstruction, messages: [{ role: "user", content: input }] }) });
    const body = await response.json() as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(body.error?.message || `${config.definition.name} rejected the request.`);
    const text = body.content?.find((item) => item.type === "text")?.text;
    if (!text) throw new Error(`${config.definition.name} returned no explanation.`);
    return parseJsonText(text);
  }
  const response = await fetch(`${config.definition.baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.apiKey}` }, body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: COMPRENDOC_SYSTEM_PROMPT + schemaInstruction }, { role: "user", content: input }], response_format: { type: "json_object" }, temperature: 0.1 }) });
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message || `${config.definition.name} rejected the request.`);
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${config.definition.name} returned no explanation.`);
  return parseJsonText(text);
}

export async function POST(request: Request) {
  try {
    if (isDemoRequest(request)) return Response.json({ error: "Live analysis is disabled on the public demo. Self-host Comprendoc to analyze your own documents." }, { status: 403 });
    const body = await request.json() as { pages?: Array<{ page: number; text: string }>; targetLanguage?: string; level?: string; documentName?: string; provider?: string };
    if (!body.pages?.length || !body.pages.some((page) => page.text?.trim())) return Response.json({ error: "No readable document text was provided." }, { status: 400 });
    const total = body.pages.reduce((sum, page) => sum + page.text.length, 0);
    if (total > 180_000) return Response.json({ error: "This document is too long for one safe analysis. Please split it into smaller files; no text was silently removed." }, { status: 413 });
    const config = await loadProviderCredential(body.provider);
    const pageText = body.pages.map((page) => `<page number="${page.page}">\n${page.text}\n</page>`).join("\n\n");
    const input = `Explain the document in ${body.targetLanguage || "English"} at a ${body.level || "Simple"} explanation level. Document filename: ${body.documentName || "document"}.\n\n${pageText}`;
    if (config.definition.protocol === "openai-responses") {
      const openai = new OpenAI({ apiKey: config.apiKey });
      const response = await openai.responses.parse({ model: config.model, instructions: COMPRENDOC_SYSTEM_PROMPT, input, text: { format: zodTextFormat(analysisSchema, "comprendoc_analysis") } });
      if (!response.output_parsed) return Response.json({ error: "The explanation could not be structured safely. Please try again." }, { status: 502 });
      return Response.json(response.output_parsed, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(await analyzeWithCompatibleProvider(config, input), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comprendoc could not explain this document right now.";
    const safeMessage = message.includes("API key") || message.includes("configured") || message.includes("decrypt") || message.includes("rejected") || message.includes("returned no") ? message : "The provider did not return a valid structured explanation. Check its model setting and try again.";
    return Response.json({ error: safeMessage }, { status: error instanceof OpenAI.RateLimitError ? 429 : 500 });
  }
}
